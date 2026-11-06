import { pool } from '../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

/**
 * 管理员实体类型
 */
export interface Admin {
  id: string
  username: string
  name: string
  phone?: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

/**
 * 根据用户名查找管理员
 *
 * @param username - 用户名
 * @returns 管理员信息（不含密码）
 */
export async function findByUsername(username: string): Promise<Admin | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, username, name, phone, role, avatar, created_at as createdAt, updated_at as updatedAt FROM admins WHERE username = ?',
    [username]
  )
  return rows.length > 0 ? (rows[0] as Admin) : null
}

/**
 * 根据用户名查找管理员（包含密码）
 *
 * 用于登录验证，返回结果包含 bcrypt 哈希密码
 *
 * @param username - 用户名
 * @returns 管理员信息（含密码）
 */
export async function findByUsernameWithPassword(username: string): Promise<(Admin & { password: string }) | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, username, password, name, phone, role, avatar, created_at as createdAt, updated_at as updatedAt FROM admins WHERE username = ?',
    [username]
  )
  return rows.length > 0 ? (rows[0] as Admin & { password: string }) : null
}

/**
 * 根据 ID 查找管理员
 *
 * @param adminId - 管理员 ID
 * @returns 管理员信息（不含密码）
 */
export async function findById(adminId: string): Promise<Admin | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, username, name, phone, role, avatar, created_at as createdAt, updated_at as updatedAt FROM admins WHERE id = ?',
    [adminId]
  )
  return rows.length > 0 ? (rows[0] as Admin) : null
}
