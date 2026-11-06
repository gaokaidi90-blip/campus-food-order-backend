import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as statsService from '../../services/stats.service.js'

/**
 * 获取仪表盘统计
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await statsService.getDashboardStats()
    res.json(success(stats))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}
