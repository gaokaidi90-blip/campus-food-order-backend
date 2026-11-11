import bcrypt from 'bcryptjs'

/**
 * Bcrypt 加盐轮数
 *
 * 轮数越高越安全，但计算时间越长
 * 10 轮是安全性和性能的良好平衡：
 * - 足够抵御暴力破解（每个密码约 0.1 秒）
 * - 不会严重影响用户体验
 */
const SALT_ROUNDS = 10

/**
 * 哈希密码
 *
 * 使用 bcrypt 对明文密码进行单向加密
 * bcrypt 会自动生成随机盐值并包含在哈希结果中
 *
 * @param password - 明文密码
 * @returns 哈希后的密码（包含盐值）
 *
 * @example
 * const hashed = await hashPassword('123456')
 * // 结果: $2b$10$N9qo8uLOickgx2ZMRZoMye...
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 *
 * 将明文密码与存储的哈希值进行比对
 * bcrypt 会自动从哈希值中提取盐值进行验证
 *
 * @param password - 用户输入的明文密码
 * @param hash - 数据库中存储的哈希密码
 * @returns 密码是否匹配
 *
 * @example
 * const isValid = await comparePassword('123456', storedHash)
 * if (isValid) {
 *   // 密码正确，允许登录
 * }
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
