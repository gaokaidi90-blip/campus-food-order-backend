import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { success, error } from '../../utils/response.js'
import * as cartModel from '../../models/cart.model.js'

/**
 * 获取购物车
 */
export async function getCart(req: Request, res: Response) {
  try {
    const userId = req.user!.userId

    const cartItems = await cartModel.findByUserId(userId)

    res.json(success(cartItems))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 添加到购物车
 */
export async function addToCart(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { dishId, canteenId, quantity } = req.body

    if (!dishId || !canteenId || !quantity) {
      return res.status(400).json(error('参数不完整'))
    }

    if (quantity <= 0) {
      return res.status(400).json(error('数量必须大于0'))
    }

    await cartModel.addToCart({
      id: uuidv4(),
      userId,
      dishId,
      canteenId,
      quantity
    })

    res.json(success(null, '添加成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 更新购物车项数量
 */
export async function updateCartItem(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { quantity } = req.body

    if (!quantity || quantity <= 0) {
      return res.status(400).json(error('数量必须大于0'))
    }

    await cartModel.updateQuantity(id, userId, quantity)

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 删除购物车项
 */
export async function removeCartItem(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params

    await cartModel.remove(id, userId)

    res.json(success(null, '删除成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 清空购物车
 */
export async function clearCart(req: Request, res: Response) {
  try {
    const userId = req.user!.userId

    await cartModel.clearByUserId(userId)

    res.json(success(null, '清空成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
