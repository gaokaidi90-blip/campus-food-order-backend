import express from 'express'
import cors from 'cors'
import userRoutes from './routes/user.routes.js'
import adminRoutes from './routes/admin.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'

/**
 * 创建 Express 应用
 */
export function createApp() {
  const app = express()

  // CORS 跨域配置
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001']
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true
    })
  )

  // 请求体解析
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 静态文件服务（上传的图片）
  app.use('/uploads', express.static('uploads'))

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // 路由
  app.use('/api/user', userRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/upload', uploadRoutes)

  // 404 处理
  app.use(notFoundHandler)

  // 全局错误处理（必须放在最后）
  app.use(errorHandler)

  return app
}
