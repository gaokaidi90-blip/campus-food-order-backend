interface OssEnv {
  OSS_ACCESS_KEY_ID: string;
  OSS_ACCESS_KEY_SECRET: string;
  OSS_STS_ROLE_ARN: string;
  OSS_BUCKET: string;
  OSS_REGION: string;
  JWT_SECRET: string;
}

const allowedOrigins = new Set([
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
  'https://campus-food-order.pages.dev', 'https://campus-food-order-admin.pages.dev',
]);
const mimeExt: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
};
let cachedSts: { id: string; secret: string; token: string; expires: number } | undefined;

function corsHeaders(origin: string | null): Headers {
  const h = new Headers({ 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400' });
  if (origin && allowedOrigins.has(origin)) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Access-Control-Allow-Credentials', 'true');
    h.set('Vary', 'Origin');
  }
  return h;
}
function json(data: unknown, status: number, origin: string | null): Response {
  const h = corsHeaders(origin); h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers: h });
}
function b64url(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function authenticate(request: Request, env: OssEnv): Promise<any | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !env.JWT_SECRET) return null;
  try {
    const [head, body, sig] = token.split('.');
    if (!head || !body || !sig || JSON.parse(new TextDecoder().decode(b64url(head))).alg !== 'HS256') return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, b64url(sig), new TextEncoder().encode(`${head}.${body}`))) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64url(body)));
    if (payload.exp && payload.exp <= Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
async function hmac(algorithm: string, key: string, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: algorithm }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
}
const rfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

async function getSts(env: OssEnv) {
  if (cachedSts && cachedSts.expires > Date.now() + 60_000) return cachedSts;
  if (!env.OSS_ACCESS_KEY_ID || !env.OSS_ACCESS_KEY_SECRET || !env.OSS_STS_ROLE_ARN || !env.OSS_REGION || !env.OSS_BUCKET) throw new Error('OSS 配置未完成');
  const params: Record<string, string> = {
    AccessKeyId: env.OSS_ACCESS_KEY_ID, Action: 'AssumeRole', DurationSeconds: '3600', Format: 'JSON',
    RoleArn: env.OSS_STS_ROLE_ARN, RoleSessionName: `campus-upload-${crypto.randomUUID()}`,
    SignatureMethod: 'HMAC-SHA1', SignatureNonce: crypto.randomUUID(), SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), Version: '2015-04-01',
  };
  const canonical = Object.keys(params).sort().map(k => `${rfc3986(k)}=${rfc3986(params[k])}`).join('&');
  const stringToSign = `POST&%2F&${rfc3986(canonical)}`;
  const sig = await hmac('SHA-1', `${env.OSS_ACCESS_KEY_SECRET}&`, stringToSign);
  params.Signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const response = await fetch(`https://sts.${env.OSS_REGION}.aliyuncs.com/`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: Object.keys(params).sort().map(k => `${rfc3986(k)}=${rfc3986(params[k])}`).join('&'),
  });
  if (!response.ok) throw new Error(`STS 请求失败 (${response.status})`);
  const result: any = await response.json();
  const credentials = result.Credentials;
  if (!credentials?.AccessKeyId || !credentials?.SecurityToken) throw new Error('STS 未返回临时凭证');
  cachedSts = { id: credentials.AccessKeyId, secret: credentials.AccessKeySecret, token: credentials.SecurityToken, expires: Date.parse(credentials.Expiration) };
  return cachedSts;
}
function objectUrl(env: OssEnv, key: string) {
  return `https://${env.OSS_BUCKET}.oss-${env.OSS_REGION}.aliyuncs.com/${key.split('/').map(encodeURIComponent).join('/')}`;
}
async function ossRequest(method: 'GET' | 'PUT', env: OssEnv, key: string, body?: ArrayBuffer, contentType = '') {
  const sts = await getSts(env);
  const date = new Date().toUTCString();
  const canonicalHeaders = `x-oss-security-token:${sts.token}\n`;
  const resource = `/${env.OSS_BUCKET}/${key}`;
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalHeaders}${resource}`;
  const signature = btoa(String.fromCharCode(...new Uint8Array(await hmac('SHA-1', sts.secret, stringToSign))));
  const headers = new Headers({ Date: date, 'x-oss-security-token': sts.token, Authorization: `OSS ${sts.id}:${signature}` });
  if (contentType) headers.set('Content-Type', contentType);
  return fetch(objectUrl(env, key), { method, headers, body: method === 'PUT' ? body : undefined });
}

export async function handleOssRequest(request: Request, env: OssEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const uploadMatch = url.pathname.match(/^\/api\/upload\/(avatar|dish|canteen)$/);
  const imageMatch = url.pathname.match(/^\/api\/images\/(avatars|dishes|canteens)\/([0-9a-f-]{36}\.(?:jpg|png|gif|webp))$/i);
  if (!uploadMatch && !imageMatch) return null;
  if (request.method === 'OPTIONS' && uploadMatch) return new Response(null, { status: 204, headers: corsHeaders(origin) });

  if (imageMatch && request.method === 'GET') {
    try {
      const key = `${imageMatch[1]}/${imageMatch[2]}`;
      const upstream = await ossRequest('GET', env, key);
      if (!upstream.ok) return new Response('图片不存在', { status: upstream.status === 404 ? 404 : 502 });
      const headers = new Headers({ 'Cache-Control': 'public, max-age=31536000, immutable' });
      const type = upstream.headers.get('content-type'); if (type) headers.set('Content-Type', type);
      const etag = upstream.headers.get('etag'); if (etag) headers.set('ETag', etag);
      return new Response(upstream.body, { status: 200, headers });
    } catch (e) { console.error('OSS image read failed', e); return new Response('图片读取失败', { status: 502 }); }
  }
  if (!uploadMatch || request.method !== 'POST') return json({ code: 405, message: 'Method Not Allowed' }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ code: 403, message: 'Origin 不允许' }, 403, origin);
  const category = uploadMatch[1];
  const identity = await authenticate(request, env);
  if (!identity) return json({ code: 401, message: '登录凭证无效或已过期，请重新登录' }, 401, origin);
  // 管理员在用户管理页也需要为用户上传头像；只有菜品和食堂图片要求管理员身份。
  const allowed = category === 'avatar'
    ? identity.type === 'user' || identity.type === 'admin'
    : identity.type === 'admin';
  if (!allowed) return json({ code: 403, message: '当前账号无权上传此类图片' }, 403, origin);
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ code: 400, message: '请选择图片文件' }, 400, origin);
    const ext = mimeExt[file.type];
    if (!ext) return json({ code: 400, message: '仅支持 jpg、png、gif、webp 图片' }, 400, origin);
    if (file.size > 2 * 1024 * 1024) return json({ code: 400, message: '图片不能超过 2MB' }, 400, origin);
    const objectKey = `${category === 'avatar' ? 'avatars' : category === 'dish' ? 'dishes' : 'canteens'}/${crypto.randomUUID()}.${ext}`;
    const uploaded = await ossRequest('PUT', env, objectKey, await file.arrayBuffer(), file.type);
    if (!uploaded.ok) throw new Error(`OSS 上传失败 (${uploaded.status})`);
    return json({ code: 200, message: '上传成功', data: { url: `${url.origin}/api/images/${objectKey}`, key: objectKey } }, 200, origin);
  } catch (e) {
    console.error('OSS upload failed', e);
    return json({ code: 502, message: '图片上传失败，请检查 Worker 的 OSS/RAM 配置' }, 502, origin);
  }
}
