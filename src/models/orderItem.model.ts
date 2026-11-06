import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

/**
 * 订单项实体类型
 */
export interface OrderItem {
  id: string
  orderId: string
  dishId: string
  dishName: string
  dishImage?: string
  price: number
  quantity: number
}

/**
 * 根据订单ID查找订单项
 *
 * @param orderId - 订单 ID
 * @param connection - 可选的数据库连接（事务中使用）
 * @returns 订单项列表
 */
export async function findByOrderId(orderId: string, connection: PoolConnection): Promise<OrderItem[]> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id, order_id as orderId, dish_id as dishId, dish_name as dishName,
     dish_image as dishImage, price, quantity
     FROM order_items
     WHERE order_id = ?`,
    [orderId]
  )

  return rows as OrderItem[]
}

/**
 * 批量创建订单项
 *
 * @param orderId - 订单 ID
 * @param items - 订单项数据数组
 * @param connection - 数据库连接（事务中使用）
 */
export async function createBatch(
  orderId: string,
  items: Array<{
    id: string
    dishId: string
    dishName: string
    dishImage?: string
    price: number
    quantity: number
  }>,
  connection: PoolConnection
): Promise<void> {
  if (items.length === 0) return

  // 构建批量插入SQL
  const values = items.map((item) => [
    item.id,
    orderId,
    item.dishId,
    item.dishName,
    item.dishImage,
    item.price,
    item.quantity
  ])

  await connection.query(
    `INSERT INTO order_items (id, order_id, dish_id, dish_name, dish_image, price, quantity)
     VALUES ?`,
    [values]
  )
}
