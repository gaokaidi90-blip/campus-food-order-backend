import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as statsService from '../../services/stats.service.js'

/**
 * 获取仪表盘统计
 *
 * 超级管理员：查看所有食堂数据
 * 普通管理员：只查看自己食堂的数据
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const admin = req.admin
    // 普通管理员只能查看自己食堂的数据
    const canteenId = admin.role === 'superadmin' ? undefined : admin.canteenId
    const stats = await statsService.getDashboardStats(canteenId)
    res.json(success(stats))
  } catch (err: any) {
    console.error('获取仪表盘统计失败:', err)
    res.status(500).json(error('获取统计数据失败，请稍后重试'))
  }
}

/**
 * 获取订单趋势
 */
export async function getOrderTrend(req: Request, res: Response) {
  try {
    const admin = req.admin
    const days = parseInt(req.query.days as string) || 7
    const canteenId = admin.role === 'superadmin' ? undefined : admin.canteenId

    const data = await statsService.getOrderTrend(days, canteenId)
    res.json(success(data))
  } catch (err: any) {
    console.error('获取订单趋势失败:', err)
    res.status(500).json(error('获取订单趋势失败，请稍后重试'))
  }
}

/**
 * 获取营业额趋势
 */
export async function getRevenueTrend(req: Request, res: Response) {
  try {
    const admin = req.admin
    const days = parseInt(req.query.days as string) || 7
    const canteenId = admin.role === 'superadmin' ? undefined : admin.canteenId

    const data = await statsService.getRevenueTrend(days, canteenId)
    res.json(success(data))
  } catch (err: any) {
    console.error('获取营业额趋势失败:', err)
    res.status(500).json(error('获取营业额趋势失败，请稍后重试'))
  }
}

/**
 * 获取订单状态分布
 */
export async function getOrderStatusDistribution(req: Request, res: Response) {
  try {
    const admin = req.admin
    const canteenId = admin.role === 'superadmin' ? undefined : admin.canteenId

    const data = await statsService.getOrderStatusDistribution(canteenId)
    res.json(success(data))
  } catch (err: any) {
    console.error('获取订单状态分布失败:', err)
    res.status(500).json(error('获取订单状态分布失败，请稍后重试'))
  }
}

/**
 * 获取热销菜品排行
 */
export async function getTopDishes(req: Request, res: Response) {
  try {
    const admin = req.admin
    const limit = parseInt(req.query.limit as string) || 10
    const canteenId = admin.role === 'superadmin' ? undefined : admin.canteenId

    const data = await statsService.getTopDishes(limit, canteenId)
    res.json(success(data))
  } catch (err: any) {
    console.error('获取热销菜品排行失败:', err)
    res.status(500).json(error('获取热销菜品排行失败，请稍后重试'))
  }
}

/**
 * 获取食堂对比数据
 *
 * 仅超级管理员可访问（通过路由中间件控制）
 */
export async function getCanteenComparison(req: Request, res: Response) {
  try {
    const data = await statsService.getCanteenComparison()
    res.json(success(data))
  } catch (err: any) {
    console.error('获取食堂对比数据失败:', err)
    res.status(500).json(error('获取食堂对比数据失败，请稍后重试'))
  }
}
