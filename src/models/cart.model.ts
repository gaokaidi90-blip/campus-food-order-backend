import { pool } from '../config/database.js'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

/**
 * 购物车项实体类型
 */
export interface CartItem {
  id: string
  userId: string
  dishId: string
  canteenId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

/**
 * 购物车项（含菜品详情）
 */
export interface CartItemWithDish extends CartItem {
  dish: {
    name: string
    image?: string
    price: number
    stock: number
    status: number
  }
}

/**
 * 查询用户的购物车
 *
 * 自动关联菜品信息
 *
 * @param userId - 用户 ID
 * @returns 购物车列表（含菜品详情）
 */
export async function findByUserId(userId: string): Promise<CartItemWithDish[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      c.id, c.user_id as userId, c.dish_id as dishId, c.canteen_id as canteenId,
      c.quantity, c.created_at as createdAt, c.updated_at as updatedAt,
      d.name as dishName, d.image as dishImage, d.price as dishPrice,
      d.stock as dishStock, d.status as dishStatus
     FROM cart_items c
     INNER JOIN dishes d ON c.dish_id = d.id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`,
    [userId]
  )

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    dishId: row.dishId,
    canteenId: row.canteenId,
    quantity: row.quantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dish: {
      name: row.dishName,
      image: row.dishImage,
      price: row.dishPrice,
      stock: row.dishStock,
      status: row.dishStatus
    }
  }))
}

/**
 * 添加到购物车
 *
 * 如果菜品已存在，则累加数量（利用 UNIQUE 约束 + ON DUPLICATE KEY UPDATE）
 *
 * @param data - 购物车项数据
 * @returns 购物车项 ID
 */
export async function addToCart(data: Omit<CartItem, 'createdAt' | 'updatedAt'>): Promise<string> {
  await pool.query(
    `INSERT INTO cart_items (id, user_id, dish_id, canteen_id, quantity)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [data.id, data.userId, data.dishId, data.canteenId, data.quantity]
  )
  return data.id
}

/**
 * 更新购物车项数量
 *
 * @param cartItemId - 购物车项 ID
 * @param userId - 用户 ID（用于验证归属权）
 * @param quantity - 新数量
 */
export async function updateQuantity(cartItemId: string, userId: string, quantity: number): Promise<void> {
  await pool.query(
    'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
    [quantity, cartItemId, userId]
  )
}

/**
 * 删除购物车项
 *
 * @param cartItemId - 购物车项 ID
 * @param userId - 用户 ID（用于验证归属权）
 */
export async function remove(cartItemId: string, userId: string): Promise<void> {
  await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [cartItemId, userId])
}

/**
 * 清空用户购物车
 *
 * @param userId - 用户 ID
 */
export async function clearByUserId(userId: string): Promise<void> {
  await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId])
}

/**
 * 清空用户指定食堂的购物车
 *
 * 用于下单后清空该食堂的购物车项
 *
 * @param userId - 用户 ID
 * @param canteenId - 食堂 ID
 * @param connection - 数据库连接（事务中使用）
 */
export async function clearByUserAndCanteen(
  userId: string,
  canteenId: string,
  connection: PoolConnection
): Promise<void> {
  await connection.query('DELETE FROM cart_items WHERE user_id = ? AND canteen_id = ?', [userId, canteenId])
}
