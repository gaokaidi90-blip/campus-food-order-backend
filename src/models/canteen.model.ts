import { getPool } from '../config/database'
import type { RowDataPacket } from 'mysql2/promise'

const pool = getPool()
/**
 * 食堂实体类型
 */
export interface Canteen {
  id: string
  name: string
  description?: string
  image?: string
  address?: string
  openTime?: string
  closeTime?: string
  status: number
  createdAt: string
  updatedAt: string
}

/**
 * 查询所有活跃食堂
 *
 * 用于用户端展示
 *
 * @returns 食堂列表（仅status=1）
 */
export async function findAllActive(): Promise<Canteen[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, image, address, open_time as openTime, close_time as closeTime,
     status, created_at as createdAt, updated_at as updatedAt
     FROM canteens WHERE status = 1 ORDER BY created_at DESC`
  )
  return rows as Canteen[]
}

/**
 * 根据ID查找食堂
 *
 * @param canteenId - 食堂 ID
 * @returns 食堂信息
 */
export async function findById(canteenId: string): Promise<Canteen | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, image, address, open_time as openTime, close_time as closeTime,
     status, created_at as createdAt, updated_at as updatedAt
     FROM canteens WHERE id = ?`,
    [canteenId]
  )
  return rows.length > 0 ? (rows[0] as Canteen) : null
}

/**
 * 分页查询食堂
 *
 * 支持关键词搜索和按食堂ID过滤
 *
 * @param params - 查询参数
 * @returns 食堂列表和总数
 */
export async function findAll(params: {
  keyword?: string
  page: number
  pageSize: number
  canteenId?: string
}): Promise<{ list: Canteen[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  let whereClause = '1=1'
  const queryParams: any[] = []

  if (params.keyword) {
    whereClause += ' AND name LIKE ?'
    queryParams.push(`%${params.keyword}%`)
  }

  // 如果指定了 canteenId，只查询该食堂
  if (params.canteenId) {
    whereClause += ' AND id = ?'
    queryParams.push(params.canteenId)
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM canteens WHERE ${whereClause}`,
    queryParams
  )
  const total = countRows[0].total

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, image, address, open_time as openTime, close_time as closeTime,
     status, created_at as createdAt, updated_at as updatedAt
     FROM canteens WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.pageSize, offset]
  )

  return { list: rows as Canteen[], total }
}

/**
 * 创建食堂
 *
 * @param data - 食堂数据
 * @returns 新食堂 ID
 */
export async function create(data: Omit<Canteen, 'createdAt' | 'updatedAt'>): Promise<string> {
  await pool.query(
    `INSERT INTO canteens (id, name, description, image, address, open_time, close_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.name, data.description, data.image, data.address, data.openTime, data.closeTime, data.status]
  )
  return data.id
}

/**
 * 更新食堂
 *
 * @param canteenId - 食堂 ID
 * @param data - 更新数据
 */
export async function update(canteenId: string, data: Partial<Omit<Canteen, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    image: 'image',
    address: 'address',
    openTime: 'open_time',
    closeTime: 'close_time',
    status: 'status'
  }

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${dbField} = ?`)
      values.push(data[key as keyof typeof data])
    }
  }

  if (fields.length === 0) return

  values.push(canteenId)
  await pool.query(`UPDATE canteens SET ${fields.join(', ')} WHERE id = ?`, values)
}

/**
 * 删除食堂
 *
 * 由于设置了外键 CASCADE，会同时删除关联的分类、菜品等
 *
 * @param canteenId - 食堂 ID
 */
export async function remove(canteenId: string): Promise<void> {
  await pool.query('DELETE FROM canteens WHERE id = ?', [canteenId])
}
