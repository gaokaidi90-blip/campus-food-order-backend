import { Request, Response } from 'express'
import { success, error, paginate } from '../../utils/response.js'
import * as orderModel from '../../models/order.model.js'

/**
 * 分页查询订单
 */
export async function getOrders(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const canteenId = req.query.canteenId as string
    const status = req.query.status as string

    const { list, total } = await orderModel.findAll({ canteenId, status, page, pageSize })

    res.json(paginate(list, total, page, pageSize))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取订单详情
 */
export async function getOrderDetail(req: Request, res: Response) {
  try {
    const { id } = req.params
    const order = await orderModel.findByIdWithDetails(id)

    if (!order) {
      return res.status(404).json(error('订单不存在'))
    }

    res.json(success(order))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { status, cancelReason } = req.body

    if (!status) {
      return res.status(400).json(error('请提供订单状态'))
    }

    // 验证状态转换是否合法
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['ready', 'cancelled'],
      ready: [],
      cancelled: []
    }

    const order = await orderModel.findByIdWithDetails(id)
    if (!order) {
      return res.status(404).json(error('订单不存在'))
    }

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json(error('无效的状态转换'))
    }

    await orderModel.updateStatus(id, status, cancelReason)

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
