import { getPool } from '../config/database'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

const pool = getPool()

/**
 * 菜品实体类型
 */
export interface Dish {
  id: string
  canteenId: string
  categoryId: string
  name: string
  description?: string
  image?: string
  price: number
  originalPrice?: number
  stock: number
  sales: number
  status: number
  specifications?: string
  createdAt: string
  updatedAt: string
}

/**
 * 查询活跃菜品（用户端）
 *
 * @param params - 筛选参数
 * @returns 菜品列表（仅status=1，按销量排序）
 */
export async function findAllActive(params: {
  canteenId?: string
  categoryId?: string
}): Promise<Dish[]> {
  let whereClause = 'status = 1'
  const queryParams: any[] = []

  if (params.canteenId) {
    whereClause += ' AND canteen_id = ?'
    queryParams.push(params.canteenId)
  }

  if (params.categoryId) {
    whereClause += ' AND category_id = ?'
    queryParams.push(params.categoryId)
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, category_id as categoryId, name, description, image,
     price, original_price as originalPrice, stock, sales, status, specifications,
     created_at as createdAt, updated_at as updatedAt
     FROM dishes WHERE ${whereClause}
     ORDER BY sales DESC, created_at DESC`,
    queryParams
  )

  return rows as Dish[]
}

/**
 * 根据ID查找菜品
 *
 * @param dishId - 菜品 ID
 * @returns 菜品信息
 */
export async function findById(dishId: string): Promise<Dish | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, category_id as categoryId, name, description, image,
     price, original_price as originalPrice, stock, sales, status, specifications,
     created_at as createdAt, updated_at as updatedAt
     FROM dishes WHERE id = ?`,
    [dishId]
  )
  return rows.length > 0 ? (rows[0] as Dish) : null
}

/**
 * 根据ID查找菜品（带行锁，用于订单事务）
 *
 * 使用 FOR UPDATE 锁定行，防止并发修改导致超卖
 *
 * @param dishId - 菜品 ID
 * @param connection - 数据库连接（事务中使用）
 * @returns 菜品信息
 */
export async function findByIdForUpdate(dishId: string, connection: PoolConnection): Promise<Dish | null> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, category_id as categoryId, name, description, image,
     price, original_price as originalPrice, stock, sales, status, specifications,
     created_at as createdAt, updated_at as updatedAt
     FROM dishes WHERE id = ? FOR UPDATE`,
    [dishId]
  )
  return rows.length > 0 ? (rows[0] as Dish) : null
}

/**
 * 更新库存和销量
 *
 * 用于订单创建和取消时的库存调整
 *
 * @param dishId - 菜品 ID
 * @param stockDelta - 库存变化量（负数为减少）
 * @param salesDelta - 销量变化量（负数为减少）
 * @param connection - 数据库连接（事务中使用）
 */
export async function updateStockAndSales(
  dishId: string,
  stockDelta: number,
  salesDelta: number,
  connection: PoolConnection
): Promise<void> {
  await connection.query(
    'UPDATE dishes SET stock = stock + ?, sales = sales + ? WHERE id = ?',
    [stockDelta, salesDelta, dishId]
  )
}

/**
 * 分页查询菜品（管理端）
 *
 * @param params - 查询参数
 * @returns 菜品列表和总数
 */
export async function findAll(params: {
  canteenId?: string
  categoryId?: string
  keyword?: string
  page: number
  pageSize: number
}): Promise<{ list: Dish[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  let whereClause = '1=1'
  const queryParams: any[] = []

  if (params.canteenId) {
    whereClause += ' AND canteen_id = ?'
    queryParams.push(params.canteenId)
  }

  if (params.categoryId) {
    whereClause += ' AND category_id = ?'
    queryParams.push(params.categoryId)
  }

  if (params.keyword) {
    whereClause += ' AND name LIKE ?'
    queryParams.push(`%${params.keyword}%`)
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM dishes WHERE ${whereClause}`,
    queryParams
  )
  const total = countRows[0].total

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, canteen_id as canteenId, category_id as categoryId, name, description, image,
     price, original_price as originalPrice, stock, sales, status, specifications,
     created_at as createdAt, updated_at as updatedAt
     FROM dishes WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.pageSize, offset]
  )

  return { list: rows as Dish[], total }
}

/**
 * 创建菜品
 *
 * @param data - 菜品数据
 * @returns 新菜品 ID
 */
export async function create(data: Omit<Dish, 'sales' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await pool.query(
    `INSERT INTO dishes (id, canteen_id, category_id, name, description, image, price, original_price, stock, status, specifications)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.canteenId,
      data.categoryId,
      data.name,
      data.description,
      data.image,
      data.price,
      data.originalPrice,
      data.stock,
      data.status,
      data.specifications
    ]
  )
  return data.id
}

/**
 * 更新菜品
 *
 * @param dishId - 菜品 ID
 * @param data - 更新数据
 */
export async function update(
  dishId: string,
  data: Partial<Omit<Dish, 'id' | 'canteenId' | 'sales' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  const fieldMap: Record<string, string> = {
    categoryId: 'category_id',
    name: 'name',
    description: 'description',
    image: 'image',
    price: 'price',
    originalPrice: 'original_price',
    stock: 'stock',
    status: 'status',
    specifications: 'specifications'
  }

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${dbField} = ?`)
      values.push(data[key as keyof typeof data])
    }
  }

  if (fields.length === 0) return

  values.push(dishId)
  await pool.query(`UPDATE dishes SET ${fields.join(', ')} WHERE id = ?`, values)
}

/**
 * 删除菜品
 *
 * @param dishId - 菜品 ID
 */
export async function remove(dishId: string): Promise<void> {
  await pool.query('DELETE FROM dishes WHERE id = ?', [dishId])
}
