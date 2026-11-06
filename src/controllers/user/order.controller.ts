import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as orderService from '../../services/order.service.js'
import * as orderModel from '../../models/order.model.js'

/**
 * 获取订单列表
 */
export async function getOrders(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { status } = req.query

    const orders = await orderModel.findByUserId(userId, status as string)

    res.json(success(orders))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取订单详情
 */
export async function getOrderDetail(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params

    // 先验证归属权
    const order = await orderModel.findByIdAndUser(id, userId)
    if (!order) {
      return res.status(404).json(error('订单不存在'))
    }

    // 查询完整详情
    const orderDetail = await orderModel.findByIdWithDetails(id)
    if (!orderDetail) {
      return res.status(404).json(error('订单不存在'))
    }

    res.json(success(orderDetail))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 创建订单
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { canteenId, addressId, items, remark } = req.body

    if (!canteenId || !addressId || !items || items.length === 0) {
      return res.status(400).json(error('参数不完整'))
    }

    const order = await orderService.createOrder(userId, {
      canteenId,
      addressId,
      items,
      remark
    })

    res.json(success(order, '下单成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 取消订单
 */
export async function cancelOrder(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json(error('请填写取消原因'))
    }

    const order = await orderService.cancelOrder(userId, id, reason)

    res.json(success(order, '取消成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
