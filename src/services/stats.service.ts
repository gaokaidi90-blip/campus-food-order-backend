import { pool } from '../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

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
 * 获取仪表盘统计
 *
 * 查询所有未取消订单的统计数据
 *
 * @returns 统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // 查询总订单数和总营收
  const [totalRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
     FROM orders
     WHERE status != 'cancelled'`
  )

  // 查询今日订单数和今日营收
  const [todayRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
     FROM orders
     WHERE status != 'cancelled'
     AND DATE(created_at) = ?`,
    [today]
  )

  return {
    totalOrders: totalRows[0].count,
    totalRevenue: parseFloat(totalRows[0].revenue),
    todayOrders: todayRows[0].count,
    todayRevenue: parseFloat(todayRows[0].revenue)
  }
}
