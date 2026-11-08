import { Router } from 'express'
import { requireUserAuth } from '../middlewares/auth.js'
import * as authController from '../controllers/user/auth.controller.js'
import * as canteenController from '../controllers/user/canteen.controller.js'
import * as cartController from '../controllers/user/cart.controller.js'
import * as orderController from '../controllers/user/order.controller.js'
import * as addressController from '../controllers/user/address.controller.js'
import * as profileController from '../controllers/user/profile.controller.js'
import * as aiController from '../controllers/user/ai.controller.js'

const router = Router()

// 认证相关（无需登录）
router.post('/register', authController.register)
router.post('/login', authController.login)

// 食堂和菜品（无需登录）
router.get('/canteens', canteenController.getCanteens)
router.get('/canteens/:id', canteenController.getCanteenDetail)
router.get('/dishes', canteenController.getDishes)
router.get('/dishes/:id', canteenController.getDishDetail)

// AI 推荐（无需登录）
router.post('/ai-recommend', aiController.recommendDishes)

// 以下接口需要登录
router.use(requireUserAuth)

// 购物车
router.get('/cart', cartController.getCart)
router.post('/cart', cartController.addToCart)
router.put('/cart/:id', cartController.updateCartItem)
router.delete('/cart/:id', cartController.removeCartItem)
router.delete('/cart', cartController.clearCart)

// 订单
router.get('/orders', orderController.getOrders)
router.get('/orders/:id', orderController.getOrderDetail)
router.post('/orders', orderController.createOrder)
router.post('/orders/:id/cancel', orderController.cancelOrder)

// 地址
router.get('/addresses', addressController.getAddresses)
router.post('/addresses', addressController.createAddress)
router.put('/addresses/:id', addressController.updateAddress)
router.delete('/addresses/:id', addressController.deleteAddress)

// 个人信息
router.get('/profile', profileController.getProfile)
router.put('/profile', profileController.updateProfile)

export default router
