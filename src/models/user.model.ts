import { getPool } from '../config/database'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

const pool = getPool()

/**
 * 用户实体类型
 */
export interface User {
  id: string
  studentId: string
  name: string
  phone: string
  avatar?: string
  createdAt: string
}

/**
 * 根据学号查找用户
 *
 * @param studentId - 学号
 * @returns 用户信息（不含密码）
 */
export async function findByStudentId(studentId: string): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, student_id as studentId, name, phone, avatar, created_at as createdAt FROM users WHERE student_id = ?',
    [studentId]
  )
  return rows.length > 0 ? (rows[0] as User) : null
}

/**
 * 根据学号查找用户（包含密码）
 *
 * 用于登录验证，返回结果包含 bcrypt 哈希密码
 *
 * @param studentId - 学号
 * @returns 用户信息（含密码）
 */
export async function findByStudentIdWithPassword(studentId: string): Promise<(User & { password: string }) | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, student_id as studentId, name, phone, avatar, password, created_at as createdAt FROM users WHERE student_id = ?',
    [studentId]
  )
  return rows.length > 0 ? (rows[0] as User & { password: string }) : null
}

/**
 * 根据 ID 查找用户
 *
 * @param userId - 用户 ID
 * @returns 用户信息（不含密码）
 */
export async function findById(userId: string): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, student_id as studentId, name, phone, avatar, created_at as createdAt FROM users WHERE id = ?',
    [userId]
  )
  return rows.length > 0 ? (rows[0] as User) : null
}

/**
 * 创建用户
 *
 * 用于用户注册
 *
 * @param data - 用户数据（含 bcrypt 哈希密码）
 * @returns 新用户 ID
 */
export async function create(data: {
  id: string
  studentId: string
  name: string
  phone: string
  password: string
}): Promise<string> {
  await pool.query(
    'INSERT INTO users (id, student_id, name, phone, password) VALUES (?, ?, ?, ?, ?)',
    [data.id, data.studentId, data.name, data.phone, data.password]
  )
  return data.id
}

/**
 * 更新用户信息
 *
 * 仅允许更新姓名和头像
 *
 * @param userId - 用户 ID
 * @param data - 更新数据
 */
export async function update(userId: string, data: { name?: string; avatar?: string }): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }

  if (data.avatar !== undefined) {
    fields.push('avatar = ?')
    values.push(data.avatar)
  }

  if (fields.length === 0) return

  values.push(userId)
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
}

/**
 * 分页查询用户
 *
 * 支持关键词搜索（学号、姓名、手机号）
 *
 * @param params - 查询参数
 * @returns 用户列表和总数
 */
export async function findAll(params: {
  keyword?: string
  page: number
  pageSize: number
}): Promise<{ users: User[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  let whereClause = '1=1'
  const queryParams: any[] = []

  if (params.keyword) {
    whereClause += ' AND (student_id LIKE ? OR name LIKE ? OR phone LIKE ?)'
    const likeKeyword = `%${params.keyword}%`
    queryParams.push(likeKeyword, likeKeyword, likeKeyword)
  }

  // 查询总数
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    queryParams
  )
  const total = countRows[0].total

  // 查询列表
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, student_id as studentId, name, phone, avatar, created_at as createdAt
     FROM users
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.pageSize, offset]
  )

  return { users: rows as User[], total }
}
