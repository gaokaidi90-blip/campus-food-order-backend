import { getPool } from '../config/database'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

const pool = getPool()

/**
 * 地址实体类型
 */
export interface Address {
  id: string
  userId: string
  name: string
  phone: string
  address: string
  building: string
  room: string
  isDefault: number
  createdAt: string
  updatedAt: string
}

/**
 * 查询用户的所有地址
 *
 * @param userId - 用户 ID
 * @returns 地址列表（默认地址排在前面）
 */
export async function findByUserId(userId: string): Promise<Address[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id as userId, name, phone, address, building, room, is_default as isDefault,
     created_at as createdAt, updated_at as updatedAt
     FROM addresses WHERE user_id = ?
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  )
  return rows as Address[]
}

/**
 * 根据ID和用户ID查找地址
 *
 * 用于验证地址归属权
 *
 * @param addressId - 地址 ID
 * @param userId - 用户 ID
 * @param connection - 可选的数据库连接（事务中使用）
 * @returns 地址信息
 */
export async function findByIdAndUser(addressId: string, userId: string, connection?: PoolConnection): Promise<Address | null> {
  const conn = connection || pool
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id as userId, name, phone, address, building, room, is_default as isDefault,
     created_at as createdAt, updated_at as updatedAt
     FROM addresses WHERE id = ? AND user_id = ?`,
    [addressId, userId]
  )
  return rows.length > 0 ? (rows[0] as Address) : null
}

/**
 * 创建地址
 *
 * 如果设置为默认地址，会自动取消该用户的其他默认地址
 *
 * @param data - 地址数据
 * @returns 新地址 ID
 */
export async function create(data: Omit<Address, 'createdAt' | 'updatedAt'>): Promise<string> {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 如果设置为默认地址，取消其他地址的默认状态
    if (data.isDefault === 1) {
      await connection.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [data.userId])
    }

    await connection.query(
      `INSERT INTO addresses (id, user_id, name, phone, address, building, room, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.userId, data.name, data.phone, data.address, data.building, data.room, data.isDefault]
    )

    await connection.commit()
    return data.id
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

/**
 * 更新地址
 *
 * 如果设置为默认地址，会自动取消该用户的其他默认地址
 *
 * @param addressId - 地址 ID
 * @param userId - 用户 ID（用于验证归属权）
 * @param data - 更新数据
 */
export async function update(
  addressId: string,
  userId: string,
  data: Partial<Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 如果设置为默认地址，取消其他地址的默认状态
    if (data.isDefault === 1) {
      await connection.query('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [userId, addressId])
    }

    const fields: string[] = []
    const values: any[] = []

    const fieldMap: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      address: 'address',
      building: 'building',
      room: 'room',
      isDefault: 'is_default'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        fields.push(`${dbField} = ?`)
        values.push(data[key as keyof typeof data])
      }
    }

    if (fields.length > 0) {
      values.push(addressId, userId)
      await connection.query(`UPDATE addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values)
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

/**
 * 删除地址
 *
 * @param addressId - 地址 ID
 * @param userId - 用户 ID（用于验证归属权）
 */
export async function remove(addressId: string, userId: string): Promise<void> {
  await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId])
}
