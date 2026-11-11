import { getPool } from '../config/database'
import type { RowDataPacket } from 'mysql2/promise'

const pool = getPool()

/**
 * 分类实体类型
 */
export interface Category {
  id: string
  canteenId: string
  name: string
  sort: number
  createdAt: string
  updatedAt: string
}

/**
 * 根据食堂ID查找分类
 *
 * @param canteenId - 食堂 ID
 * @returns 分类列表（按排序权重和创建时间排序）
 */
export async function findByCanteenId(canteenId: string): Promise<Category[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, name, sort, created_at as createdAt, updated_at as updatedAt
     FROM categories WHERE canteen_id = ? ORDER BY sort ASC, created_at ASC`,
    [canteenId]
  )
  return rows as Category[]
}

/**
 * 根据ID查找分类
 *
 * @param categoryId - 分类 ID
 * @returns 分类信息
 */
export async function findById(categoryId: string): Promise<Category | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, name, sort, created_at as createdAt, updated_at as updatedAt
     FROM categories WHERE id = ?`,
    [categoryId]
  )
  return rows.length > 0 ? (rows[0] as Category) : null
}

/**
 * 分页查询分类
 *
 * 支持按食堂筛选和关键词搜索
 *
 * @param params - 查询参数
 * @returns 分类列表和总数
 */
export async function findAll(params: {
  canteenId?: string
  keyword?: string
  page: number
  pageSize: number
}): Promise<{ list: Category[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  let whereClause = '1=1'
  const queryParams: any[] = []

  if (params.canteenId) {
    whereClause += ' AND canteen_id = ?'
    queryParams.push(params.canteenId)
  }

  if (params.keyword) {
    whereClause += ' AND name LIKE ?'
    queryParams.push(`%${params.keyword}%`)
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM categories WHERE ${whereClause}`,
    queryParams
  )
  const total = countRows[0].total

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, name, sort, created_at as createdAt, updated_at as updatedAt
     FROM categories WHERE ${whereClause}
     ORDER BY sort ASC, created_at ASC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.pageSize, offset]
  )

  return { list: rows as Category[], total }
}

/**
 * 创建分类
 *
 * @param data - 分类数据
 * @returns 新分类 ID
 */
export async function create(data: Omit<Category, 'createdAt' | 'updatedAt'>): Promise<string> {
  await pool.query(
    'INSERT INTO categories (id, canteen_id, name, sort) VALUES (?, ?, ?, ?)',
    [data.id, data.canteenId, data.name, data.sort]
  )
  return data.id
}

/**
 * 更新分类
 *
 * @param categoryId - 分类 ID
 * @param data - 更新数据
 */
export async function update(categoryId: string, data: Partial<{ name: string; sort: number }>): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }

  if (data.sort !== undefined) {
    fields.push('sort = ?')
    values.push(data.sort)
  }

  if (fields.length === 0) return

  values.push(categoryId)
  await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values)
}

/**
 * 删除分类
 *
 * 由于设置了外键 CASCADE，会同时删除关联的菜品
 *
 * @param categoryId - 分类 ID
 */
export async function remove(categoryId: string): Promise<void> {
  await pool.query('DELETE FROM categories WHERE id = ?', [categoryId])
}
