import { v4 as uuidv4 } from 'uuid'
import { getPool } from '../config/database'
import * as orderModel from '../models/order.model.js'
import * as orderItemModel from '../models/orderItem.model.js'
import * as dishModel from '../models/dish.model.js'
import * as addressModel from '../models/address.model.js'
import * as canteenModel from '../models/canteen.model.js'
import * as cartModel from '../models/cart.model.js'

const pool = getPool()

/**
 * 创建订单（事务）
 *
 * 业务流程：
 * 1. 验证地址归属权
 * 2. 验证食堂存在
 * 3. 锁定菜品并验证（库存、状态、所属食堂）
 * 4. 扣减库存、增加销量
 * 5. 创建订单
 * 6. 创建订单项
 * 7. 清空购物车
 *
 * @param userId - 用户 ID
 * @param orderData - 订单数据
 * @returns 订单详情
 */
export async function createOrder(
  userId: string,
  orderData: {
    canteenId: string
    addressId: string
    items: Array<{ dishId: string; quantity: number }>
    remark?: string
  }
): Promise<orderModel.OrderWithDetails> {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. 验证地址归属权
    const address = await addressModel.findByIdAndUser(orderData.addressId, userId, connection)
    if (!address) {
      throw new Error('收货地址不存在')
    }

    // 2. 验证食堂存在
    const canteen = await canteenModel.findById(orderData.canteenId)
    if (!canteen) {
      throw new Error('食堂不存在')
    }

    // 3. 锁定菜品并验证，计算总金额
    let totalAmount = 0
    const orderItems: Array<{
      id: string
      dishId: string
      dishName: string
      dishImage?: string
      price: number
      quantity: number
    }> = []

    for (const item of orderData.items) {
      // 使用 FOR UPDATE 锁定菜品行，防止并发超卖
      const dish = await dishModel.findByIdForUpdate(item.dishId, connection)

      if (!dish) {
        throw new Error(`菜品不存在：${item.dishId}`)
      }

      if (dish.status !== 1) {
        throw new Error(`菜品已下架：${dish.name}`)
      }

      if (dish.canteenId !== orderData.canteenId) {
        throw new Error(`菜品不属于所选食堂：${dish.name}`)
      }

      if (dish.stock < item.quantity) {
        throw new Error(`库存不足：${dish.name}（剩余 ${dish.stock}）`)
      }

      // 计算小计
      const itemTotal = dish.price * item.quantity
      totalAmount += itemTotal

      // 快照菜品信息
      orderItems.push({
        id: uuidv4(),
        dishId: dish.id,
        dishName: dish.name,
        dishImage: dish.image,
        price: dish.price,
        quantity: item.quantity
      })

      // 4. 扣减库存、增加销量
      await dishModel.updateStockAndSales(dish.id, -item.quantity, item.quantity, connection)
    }

    // 5. 创建订单
    const orderId = uuidv4()
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    await orderModel.create(
      {
        id: orderId,
        orderNo,
        userId,
        canteenId: orderData.canteenId,
        addressId: orderData.addressId,
        status: 'pending',
        totalAmount,
        remark: orderData.remark
      },
      connection
    )

    // 6. 创建订单项
    await orderItemModel.createBatch(orderId, orderItems, connection)

    // 7. 清空该食堂的购物车
    await cartModel.clearByUserAndCanteen(userId, orderData.canteenId, connection)

    await connection.commit()

    // 8. 返回订单详情
    const order = await orderModel.findByIdWithDetails(orderId)
    if (!order) {
      throw new Error('订单创建失败')
    }

    return order
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

/**
 * 取消订单（事务）
 *
 * 业务流程：
 * 1. 锁定订单并验证归属权
 * 2. 验证订单状态（只能取消 pending/accepted）
 * 3. 更新订单状态为 cancelled
 * 4. 恢复库存、减少销量
 *
 * @param userId - 用户 ID
 * @param orderId - 订单 ID
 * @param reason - 取消原因
 * @returns 订单详情
 */
export async function cancelOrder(
  userId: string,
  orderId: string,
  reason: string
): Promise<orderModel.OrderWithDetails> {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. 锁定订单
    const order = await orderModel.findByIdAndUserForUpdate(orderId, userId, connection)

    if (!order) {
      throw new Error('订单不存在')
    }

    // 2. 验证订单状态
    if (order.status !== 'pending' && order.status !== 'accepted') {
      throw new Error('该订单状态不允许取消')
    }

    // 3. 更新订单状态
    await orderModel.updateStatus(orderId, 'cancelled', reason, connection)

    // 4. 恢复库存、减少销量
    const items = await orderItemModel.findByOrderId(orderId, connection)
    for (const item of items) {
      await dishModel.updateStockAndSales(item.dishId, item.quantity, -item.quantity, connection)
    }

    await connection.commit()

    // 返回订单详情
    const updatedOrder = await orderModel.findByIdWithDetails(orderId)
    if (!updatedOrder) {
      throw new Error('订单查询失败')
    }

    return updatedOrder
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
