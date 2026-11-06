import { Request, Response, NextFunction } from 'express'
import { error } from '../utils/response.js'

/**
 * 全局错误处理中间件
 *
 * 捕获所有未处理的错误，统一格式化后返回给客户端
 * 防止错误堆栈等敏感信息泄露
 *
 * 使用位置：在所有路由之后注册
 *
 * @example
 * app.use('/api', routes)
 * app.use(errorHandler)  // 必须在最后
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err)

  // Multer 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json(error('文件大小不能超过 2MB'))
  }

  if (err.message === '只允许上传图片文件') {
    return res.status(400).json(error(err.message))
  }

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json(error('数据已存在'))
  }

  // 默认错误
  // 生产环境下不应暴露详细错误信息
  const message = err.message || '服务器内部错误'
  const statusCode = err.statusCode || 500

  res.status(statusCode).json(error(message, statusCode))
}

/**
 * 404 处理中间件
 *
 * 捕获所有未匹配的路由请求
 * 返回统一的 404 错误
 *
 * 使用位置：在所有业务路由之后、错误处理中间件之前
 *
 * @example
 * app.use('/api', routes)
 * app.use(notFoundHandler)  // 404 处理
 * app.use(errorHandler)     // 错误处理
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(error('接口不存在', 404))
}
