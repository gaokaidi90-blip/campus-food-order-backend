import { getPool } from '../config/database'
import type { RowDataPacket } from 'mysql2/promise'

const pool = getPool()

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  totalOrders: number      // 总订单数（不含已取消）
  todayOrders: number      // 今日订单数（不含已取消）
  totalRevenue: number     // 总营收（不含已取消）
  todayRevenue: number     // 今日营收（不含已取消）
}

/**
 * 趋势数据
 */
export interface TrendData {
  date: string    // 日期 YYYY-MM-DD
  value: number   // 数值
}

/**
 * 订单状态分布
 */
export interface StatusDistribution {
  status: string  // 状态：pending/accepted/ready/cancelled
  count: number   // 数量
}

/**
 * 菜品排行
 */
export interface DishRank {
  dishId: string
  dishName: string
  count: number       // 销售数量
  revenue: number     // 销售额
}

/**
 * 食堂对比统计
 */
export interface CanteenStats {
  canteenId: string
  canteenName: string
  orders: number
  revenue: number
}

/**
 * 获取仪表盘统计
 *
 * 查询所有未取消订单的统计数据，支持按食堂过滤
 *
 * @param canteenId - 可选，食堂ID（普通管理员只能查看自己食堂的数据）
 * @returns 统计数据
 */
export async function getDashboardStats(canteenId?: string): Promise<DashboardStats> {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // 构建查询条件
    let whereClause = "status != 'cancelled'"
    const params: any[] = []

    if (canteenId) {
      whereClause += ' AND canteen_id = ?'
      params.push(canteenId)
    }

    // 查询总订单数和总营收
    const [totalRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE ${whereClause}`,
      params
    )

    // 查询今日订单数和今日营收
    const [todayRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE ${whereClause}
       AND DATE(created_at) = ?`,
      [...params, today]
    )

    return {
      totalOrders: totalRows[0]?.count || 0,
      totalRevenue: parseFloat(totalRows[0]?.revenue || '0'),
      todayOrders: todayRows[0]?.count || 0,
      todayRevenue: parseFloat(todayRows[0]?.revenue || '0')
    }
  } catch (error) {
    console.error('获取仪表盘统计失败:', error)
    // 返回空数据而不是抛出异常
    return {
      totalOrders: 0,
      totalRevenue: 0,
      todayOrders: 0,
      todayRevenue: 0
    }
  }
}

/**
 * 获取订单趋势
 *
 * 查询最近N天的订单数量趋势
 *
 * @param days - 天数（默认7天）
 * @param canteenId - 可选，食堂ID
 * @returns 趋势数据数组
 */
export async function getOrderTrend(days: number = 7, canteenId?: string): Promise<TrendData[]> {
  try {
    let whereClause = "status != 'cancelled'"
    const params: any[] = []

    if (canteenId) {
      whereClause += ' AND canteen_id = ?'
      params.push(canteenId)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as value
       FROM orders
       WHERE ${whereClause}
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [...params, days]
    )

    // 填充缺失的日期（如果某天没有订单）
    const result: TrendData[] = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const found = rows.find((row: any) => {
        const rowDate = row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10)
        return rowDate === dateStr
      })
      result.push({
        date: dateStr,
        value: found ? found.value : 0
      })
    }

    return result
  } catch (error) {
    console.error('获取订单趋势失败:', error)
    return []
  }
}

/**
 * 获取营业额趋势
 *
 * 查询最近N天的营业额趋势
 *
 * @param days - 天数（默认7天）
 * @param canteenId - 可选，食堂ID
 * @returns 趋势数据数组
 */
export async function getRevenueTrend(days: number = 7, canteenId?: string): Promise<TrendData[]> {
  try {
    let whereClause = "status != 'cancelled'"
    const params: any[] = []

    if (canteenId) {
      whereClause += ' AND canteen_id = ?'
      params.push(canteenId)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as value
       FROM orders
       WHERE ${whereClause}
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [...params, days]
    )

    // 填充缺失的日期
    const result: TrendData[] = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const found = rows.find((row: any) => {
        const rowDate = row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10)
        return rowDate === dateStr
      })
      result.push({
        date: dateStr,
        value: found ? parseFloat(found.value) : 0
      })
    }

    return result
  } catch (error) {
    console.error('获取营业额趋势失败:', error)
    return []
  }
}

/**
 * 获取订单状态分布
 *
 * 统计各状态的订单数量
 *
 * @param canteenId - 可选，食堂ID
 * @returns 状态分布数据
 */
export async function getOrderStatusDistribution(canteenId?: string): Promise<StatusDistribution[]> {
  try {
    let whereClause = '1=1'
    const params: any[] = []

    if (canteenId) {
      whereClause += ' AND canteen_id = ?'
      params.push(canteenId)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM orders
       WHERE ${whereClause}
       GROUP BY status
       ORDER BY count DESC`,
      params
    )

    return rows.map((row: any) => ({
      status: row.status,
      count: row.count
    }))
  } catch (error) {
    console.error('获取订单状态分布失败:', error)
    return []
  }
}

/**
 * 获取热销菜品排行
 *
 * 统计销量最高的菜品
 *
 * @param limit - 返回数量（默认10）
 * @param canteenId - 可选，食堂ID
 * @returns 菜品排行数据
 */
export async function getTopDishes(limit: number = 10, canteenId?: string): Promise<DishRank[]> {
  try {
    let whereClause = "o.status != 'cancelled'"
    const params: any[] = []

    if (canteenId) {
      whereClause += ' AND o.canteen_id = ?'
      params.push(canteenId)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         oi.dish_id as dishId,
         d.name as dishName,
         SUM(oi.quantity) as count,
         SUM(oi.quantity * oi.price) as revenue
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       INNER JOIN dishes d ON oi.dish_id = d.id
       WHERE ${whereClause}
       GROUP BY oi.dish_id, d.name
       ORDER BY count DESC
       LIMIT ?`,
      [...params, limit]
    )

    return rows.map((row: any) => ({
      dishId: row.dishId,
      dishName: row.dishName,
      count: row.count,
      revenue: parseFloat(row.revenue)
    }))
  } catch (error) {
    console.error('获取热销菜品排行失败:', error)
    return []
  }
}

/**
 * 获取食堂对比数据
 *
 * 统计各食堂的订单数和营业额（仅超级管理员）
 *
 * @returns 食堂统计数据
 */
export async function getCanteenComparison(): Promise<CanteenStats[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         c.id as canteenId,
         c.name as canteenName,
         COUNT(o.id) as orders,
         COALESCE(SUM(o.total_amount), 0) as revenue
       FROM canteens c
       LEFT JOIN orders o ON c.id = o.canteen_id AND o.status != 'cancelled'
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`
    )

    return rows.map((row: any) => ({
      canteenId: row.canteenId,
      canteenName: row.canteenName,
      orders: row.orders,
      revenue: parseFloat(row.revenue)
    }))
  } catch (error) {
    console.error('获取食堂对比数据失败:', error)
    return []
  }
}
