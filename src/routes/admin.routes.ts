import { Router } from 'express'
import { requireAdminAuth, requireSuperAdmin } from '../middlewares/auth.js'
import * as authController from '../controllers/admin/auth.controller.js'
import * as statsController from '../controllers/admin/stats.controller.js'
import * as canteenController from '../controllers/admin/canteen.controller.js'
import * as categoryController from '../controllers/admin/category.controller.js'
import * as dishController from '../controllers/admin/dish.controller.js'
import * as orderController from '../controllers/admin/order.controller.js'
import * as userController from '../controllers/admin/user.controller.js'

const router = Router()

// 登录（无需认证）
router.post('/login', authController.login)

// 以下接口需要管理员认证
router.use(requireAdminAuth)

// 统计
router.get('/stats/dashboard', statsController.getDashboardStats)

// 食堂管理
// 列表查询：所有管理员可访问（根据权限过滤）
router.get('/canteens', canteenController.getCanteens)
// 增删改操作：仅超级管理员可访问
router.get('/canteens/:id', requireSuperAdmin, canteenController.getCanteenDetail)
router.post('/canteens', requireSuperAdmin, canteenController.createCanteen)
router.put('/canteens/:id', requireSuperAdmin, canteenController.updateCanteen)
router.delete('/canteens/:id', requireSuperAdmin, canteenController.deleteCanteen)

// 分类管理
router.get('/categories', categoryController.getCategories)
router.get('/categories/:id', categoryController.getCategoryDetail)
router.post('/categories', categoryController.createCategory)
router.put('/categories/:id', categoryController.updateCategory)
router.delete('/categories/:id', categoryController.deleteCategory)

// 菜品管理
router.get('/dishes', dishController.getDishes)
router.get('/dishes/:id', dishController.getDishDetail)
router.post('/dishes', dishController.createDish)
router.put('/dishes/:id', dishController.updateDish)
router.delete('/dishes/:id', dishController.deleteDish)

// 订单管理
router.get('/orders', orderController.getOrders)
router.get('/orders/:id', orderController.getOrderDetail)
router.put('/orders/:id/status', orderController.updateOrderStatus)

// 用户管理（只读）
router.get('/users', userController.getUsers)
router.get('/users/:id', userController.getUserDetail)
// 注释掉编辑功能：用户管理改为只读
// router.put('/users/:id', userController.updateUser)

export default router
