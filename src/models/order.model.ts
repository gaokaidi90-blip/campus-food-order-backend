import { pool } from '../config/database.js'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

/**
 * 订单实体类型
 */
export interface Order {
  id: string
  orderNo: string
  userId: string
  canteenId: string
  addressId: string
  status: 'pending' | 'accepted' | 'ready' | 'cancelled'
  totalAmount: number
  remark?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
}

/**
 * 订单详情（含关联信息）
 */
export interface OrderWithDetails extends Order {
  user: {
    name: string
    phone: string
    studentId: string
  }
  canteen: {
    name: string
    address?: string
  }
  address: {
    name: string
    phone: string
    address: string
    building: string
    room: string
  }
  items: Array<{
    id: string
    dishId: string
    dishName: string
    dishImage?: string
    price: number
    quantity: number
  }>
}

/**
 * 查询用户的订单列表
 *
 * @param userId - 用户 ID
 * @param status - 可选的状态筛选
 * @returns 订单列表
 */
export async function findByUserId(userId: string, status?: string): Promise<Order[]> {
  let whereClause = 'user_id = ?'
  const params: any[] = [userId]

  if (status) {
    whereClause += ' AND status = ?'
    params.push(status)
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, order_no as orderNo, user_id as userId, canteen_id as canteenId,
     address_id as addressId, status, total_amount as totalAmount, remark, cancel_reason as cancelReason,
     created_at as createdAt, updated_at as updatedAt
     FROM orders
     WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params
  )

  return rows as Order[]
}

/**
 * 根据ID和用户ID查找订单
 *
 * 用于验证订单归属权
 *
 * @param orderId - 订单 ID
 * @param userId - 用户 ID
 * @param connection - 可选的数据库连接（事务中使用）
 * @returns 订单信息
 */
export async function findByIdAndUser(
  orderId: string,
  userId: string,
  connection?: PoolConnection
): Promise<Order | null> {
  const conn = connection || pool
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, order_no as orderNo, user_id as userId, canteen_id as canteenId,
     address_id as addressId, status, total_amount as totalAmount, remark, cancel_reason as cancelReason,
     created_at as createdAt, updated_at as updatedAt
     FROM orders
     WHERE id = ? AND user_id = ?`,
    [orderId, userId]
  )

  return rows.length > 0 ? (rows[0] as Order) : null
}

/**
 * 根据ID和用户ID查找订单（带行锁）
 *
 * 用于订单取消时防止并发修改
 *
 * @param orderId - 订单 ID
 * @param userId - 用户 ID
 * @param connection - 数据库连接（事务中使用）
 * @returns 订单信息
 */
export async function findByIdAndUserForUpdate(
  orderId: string,
  userId: string,
  connection: PoolConnection
): Promise<Order | null> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id, order_no as orderNo, user_id as userId, canteen_id as canteenId,
     address_id as addressId, status, total_amount as totalAmount, remark, cancel_reason as cancelReason,
     created_at as createdAt, updated_at as updatedAt
     FROM orders
     WHERE id = ? AND user_id = ?
     FOR UPDATE`,
    [orderId, userId]
  )

  return rows.length > 0 ? (rows[0] as Order) : null
}

/**
 * 根据ID查找订单（含完整关联信息）
 *
 * 用于订单详情展示
 *
 * @param orderId - 订单 ID
 * @returns 订单详情
 */
export async function findByIdWithDetails(orderId: string): Promise<OrderWithDetails | null> {
  // 查询订单基本信息及关联的用户、食堂、地址
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      o.id, o.order_no as orderNo, o.user_id as userId, o.canteen_id as canteenId,
      o.address_id as addressId, o.status, o.total_amount as totalAmount,
      o.remark, o.cancel_reason as cancelReason,
      o.created_at as createdAt, o.updated_at as updatedAt,
      u.name as userName, u.phone as userPhone, u.student_id as userStudentId,
      c.name as canteenName, c.address as canteenAddress,
      a.name as addressName, a.phone as addressPhone, a.address as addressAddress,
      a.building as addressBuilding, a.room as addressRoom
     FROM orders o
     INNER JOIN users u ON o.user_id = u.id
     INNER JOIN canteens c ON o.canteen_id = c.id
     INNER JOIN addresses a ON o.address_id = a.id
     WHERE o.id = ?`,
    [orderId]
  )

  if (orderRows.length === 0) return null

  const orderRow = orderRows[0]

  // 查询订单项
  const [itemRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, dish_id as dishId, dish_name as dishName, dish_image as dishImage,
     price, quantity
     FROM order_items
     WHERE order_id = ?`,
    [orderId]
  )

  return {
    id: orderRow.id,
    orderNo: orderRow.orderNo,
    userId: orderRow.userId,
    canteenId: orderRow.canteenId,
    addressId: orderRow.addressId,
    status: orderRow.status,
    totalAmount: orderRow.totalAmount,
    remark: orderRow.remark,
    cancelReason: orderRow.cancelReason,
    createdAt: orderRow.createdAt,
    updatedAt: orderRow.updatedAt,
    user: {
      name: orderRow.userName,
      phone: orderRow.userPhone,
      studentId: orderRow.userStudentId
    },
    canteen: {
      name: orderRow.canteenName,
      address: orderRow.canteenAddress
    },
    address: {
      name: orderRow.addressName,
      phone: orderRow.addressPhone,
      address: orderRow.addressAddress,
      building: orderRow.addressBuilding,
      room: orderRow.addressRoom
    },
    items: itemRows.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      dishName: item.dishName,
      dishImage: item.dishImage,
      price: item.price,
      quantity: item.quantity
    }))
  }
}

/**
 * 创建订单
 *
 * @param data - 订单数据
 * @param connection - 数据库连接（事务中使用）
 * @returns 新订单 ID
 */
export async function create(
  data: Omit<Order, 'createdAt' | 'updatedAt'>,
  connection: PoolConnection
): Promise<string> {
  await connection.query(
    `INSERT INTO orders (id, order_no, user_id, canteen_id, address_id, status, total_amount, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.orderNo, data.userId, data.canteenId, data.addressId, data.status, data.totalAmount, data.remark]
  )
  return data.id
}

/**
 * 更新订单状态
 *
 * @param orderId - 订单 ID
 * @param status - 新状态
 * @param cancelReason - 取消原因（可选，仅当status为cancelled时使用）
 * @param connection - 可选的数据库连接（事务中使用）
 */
export async function updateStatus(
  orderId: string,
  status: string,
  cancelReason?: string,
  connection?: PoolConnection
): Promise<void> {
  const conn = connection || pool

  if (cancelReason) {
    await conn.query(
      'UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?',
      [status, cancelReason, orderId]
    )
  } else {
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId])
  }
}

/**
 * 分页查询订单（管理端）
 *
 * @param params - 查询参数
 * @returns 订单列表和总数
 */
export async function findAll(params: {
  canteenId?: string
  status?: string
  page: number
  pageSize: number
}): Promise<{ list: OrderWithDetails[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  let whereClause = '1=1'
  const queryParams: any[] = []

  if (params.canteenId) {
    whereClause += ' AND o.canteen_id = ?'
    queryParams.push(params.canteenId)
  }

  if (params.status) {
    whereClause += ' AND o.status = ?'
    queryParams.push(params.status)
  }

  // 查询总数
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
    queryParams
  )
  const total = countRows[0].total

  // 查询订单列表（含基本关联信息）
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      o.id, o.order_no as orderNo, o.user_id as userId, o.canteen_id as canteenId,
      o.address_id as addressId, o.status, o.total_amount as totalAmount,
      o.remark, o.cancel_reason as cancelReason,
      o.created_at as createdAt, o.updated_at as updatedAt,
      u.name as userName, u.phone as userPhone, u.student_id as userStudentId,
      c.name as canteenName, c.address as canteenAddress,
      a.name as addressName, a.phone as addressPhone, a.address as addressAddress,
      a.building as addressBuilding, a.room as addressRoom
     FROM orders o
     INNER JOIN users u ON o.user_id = u.id
     INNER JOIN canteens c ON o.canteen_id = c.id
     INNER JOIN addresses a ON o.address_id = a.id
     WHERE ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.pageSize, offset]
  )

  // 为每个订单查询订单项
  const list: OrderWithDetails[] = []
  for (const orderRow of orderRows) {
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, dish_id as dishId, dish_name as dishName, dish_image as dishImage,
       price, quantity
       FROM order_items
       WHERE order_id = ?`,
      [orderRow.id]
    )

    list.push({
      id: orderRow.id,
      orderNo: orderRow.orderNo,
      userId: orderRow.userId,
      canteenId: orderRow.canteenId,
      addressId: orderRow.addressId,
      status: orderRow.status,
      totalAmount: orderRow.totalAmount,
      remark: orderRow.remark,
      cancelReason: orderRow.cancelReason,
      createdAt: orderRow.createdAt,
      updatedAt: orderRow.updatedAt,
      user: {
        name: orderRow.userName,
        phone: orderRow.userPhone,
        studentId: orderRow.userStudentId
      },
      canteen: {
        name: orderRow.canteenName,
        address: orderRow.canteenAddress
      },
      address: {
        name: orderRow.addressName,
        phone: orderRow.addressPhone,
        address: orderRow.addressAddress,
        building: orderRow.addressBuilding,
        room: orderRow.addressRoom
      },
      items: itemRows.map((item) => ({
        id: item.id,
        dishId: item.dishId,
        dishName: item.dishName,
        dishImage: item.dishImage,
        price: item.price,
        quantity: item.quantity
      }))
    })
  }

  return { list, total }
}
