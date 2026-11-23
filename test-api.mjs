import https from 'https';

const apiKey = process.env.ANTHROPIC_API_KEY;
const apiBaseUrl = process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com';

console.log('Testing API...');
console.log('API Base URL:', apiBaseUrl);
console.log('API Key exists:', !!apiKey);
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set!');
  process.exit(1);
}

const url = new URL(apiBaseUrl);
const requestBody = JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'Say hello' }]
});

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
    'anthropic-version': '2023-06-01',
    'x-api-key': apiKey
  }
};

console.log('\nSending request to:', `${url.hostname}${options.path}`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk });
  res.on('end', () => {
    console.log('\n✓ Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✓ API is working!');
      try {
        const json = JSON.parse(data);
        console.log('Response:', json.content?.[0]?.text || 'No content');
      } catch (e) {
        console.log('Raw response:', data.substring(0, 500));
      }
    } else {
      console.log('❌ API Error:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
});

req.setTimeout(10000, () => {
  console.error('❌ Request timeout');
  req.destroy();
});

req.write(requestBody);
req.end();
