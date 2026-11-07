import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

/**
 * JWT 密钥
 *
 * 警告：生产环境必须设置强密钥！
 * 密钥泄露会导致任何人都能伪造 token
 */
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production'

/**
 * JWT 过期时间
 *
 * 默认 7 天，可根据安全要求调整：
 * - 时间越短越安全，但用户需要频繁登录
 * - 时间越长越方便，但被盗用的风险窗口更大
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 用户 Token 载荷
 *
 * 包含用户身份标识和类型标记
 * type 字段用于区分用户和管理员 token
 */
export interface UserTokenPayload {
  userId: string      // 用户 ID（UUID）
  studentId: string   // 学号（用于显示）
  type: 'user'        // 类型标记
}

/**
 * 管理员 Token 载荷
 *
 * 包含管理员身份标识、角色、食堂关联和类型标记
 */
export interface AdminTokenPayload {
  adminId: string     // 管理员 ID（UUID）
  username: string    // 用户名
  role: string        // 角色（admin/superadmin）
  canteenId: number | null  // 关联的食堂 ID，NULL 表示超级管理员
  type: 'admin'       // 类型标记
}

/**
 * Token 载荷联合类型
 */
export type TokenPayload = UserTokenPayload | AdminTokenPayload

/**
 * 生成 JWT token
 *
 * 使用 HMAC SHA256 算法签名，确保 token 不可伪造
 * Token 包含载荷数据和过期时间
 *
 * @param payload - 用户或管理员载荷
 * @returns JWT token 字符串
 *
 * @example
 * // 用户登录
 * const token = generateToken({
 *   userId: 'xxx',
 *   studentId: '2021001',
 *   type: 'user'
 * })
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证并解析 JWT token
 *
 * 验证签名和过期时间，返回载荷数据
 * 如果 token 无效或过期，抛出异常
 *
 * @param token - JWT token 字符串
 * @returns 解析后的载荷
 * @throws Error token 无效或已过期
 *
 * @example
 * try {
 *   const payload = verifyToken(token)
 *   if (payload.type === 'user') {
 *     // 处理用户请求
 *   }
 * } catch (error) {
 *   // Token 无效
 * }
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * 从 Authorization header 提取 Bearer token
 *
 * 标准的 HTTP 认证格式：Authorization: Bearer <token>
 *
 * @param authHeader - Authorization 请求头的值
 * @returns 提取的 token，如果格式不正确返回 null
 *
 * @example
 * const token = extractBearerToken(req.headers.authorization)
 * // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * // 返回: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)  // 去掉 "Bearer " 前缀（7 个字符）
}
