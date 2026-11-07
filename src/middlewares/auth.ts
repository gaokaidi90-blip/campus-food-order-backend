import { Request, Response, NextFunction } from 'express'
import { extractBearerToken, verifyToken } from '../utils/jwt.js'
import { error } from '../utils/response.js'

/**
 * 用户认证中间件
 *
 * 验证用户 JWT token，确保请求来自已登录的用户
 * 验证通过后，将用户信息注入到 req.user
 *
 * 使用场景：
 * - 用户端所有需要登录的接口
 * - 如：查看订单、管理地址、下单等
 *
 * @example
 * router.get('/orders', requireUserAuth, getOrders)
 */
export function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 从 Authorization header 提取 token
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      return res.status(401).json(error('未授权访问', 401))
    }

    // 验证并解析 token
    const payload = verifyToken(token)

    // 检查 token 类型，确保是用户 token
    if (payload.type !== 'user') {
      return res.status(401).json(error('无效的用户令牌', 401))
    }

    // 将用户信息附加到请求对象
    // 后续 controller 可通过 req.user 获取当前用户信息
    req.user = {
      userId: payload.userId,
      studentId: payload.studentId
    }

    next()
  } catch (err) {
    // Token 无效或已过期
    return res.status(401).json(error('令牌无效或已过期', 401))
  }
}

/**
 * 管理员认证中间件
 *
 * 验证管理员 JWT token，确保请求来自已登录的管理员
 * 验证通过后，将管理员信息注入到 req.admin
 *
 * 使用场景：
 * - 管理端所有接口
 * - 如：管理食堂、菜品、订单、用户等
 *
 * 权限说明：
 * - 本中间件只验证是否为管理员，不区分角色（admin/superadmin）
 * - 如需细粒度权限控制，使用 requireSuperAdmin 或在 controller 中检查
 *
 * @example
 * router.get('/admin/orders', requireAdminAuth, getOrders)
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json(error('需要超级管理员权限', 403))
  }
  next()
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 从 Authorization header 提取 token
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      return res.status(401).json(error('未授权访问', 401))
    }

    // 验证并解析 token
    const payload = verifyToken(token)

    // 检查 token 类型，确保是管理员 token
    if (payload.type !== 'admin') {
      return res.status(401).json(error('无效的管理员令牌', 401))
    }

    // 将管理员信息附加到请求对象
    // 后续 controller 可通过 req.admin 获取当前管理员信息
    req.admin = {
      adminId: payload.adminId,
      username: payload.username,
      role: payload.role,
      canteenId: payload.canteenId  // 新增：食堂 ID
    }

    next()
  } catch (err) {
    // Token 无效或已过期
    return res.status(401).json(error('令牌无效或已过期', 401))
  }
}

/**
 * 超级管理员认证中间件
 *
 * 验证当前管理员是否为超级管理员（role = 'superadmin'）
 * 必须在 requireAdminAuth 之后使用
 *
 * 使用场景：
 * - 食堂管理相关接口（创建、编辑、删除食堂）
 * - 其他需要超级管理员权限的操作
 *
 * @example
 * router.post('/admin/canteens', requireAdminAuth, requireSuperAdmin, createCanteen)
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json(error('需要超级管理员权限', 403))
  }
  next()
}
