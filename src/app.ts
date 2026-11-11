import express from 'express'
import cors from 'cors'
import userRoutes from './routes/user.routes'
import adminRoutes from './routes/admin.routes'
import uploadRoutes from './routes/upload.routes'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler'
import { getPool } from './config/database'

/**
 * 创建 Express 应用
 */
export function createApp() {
  const app = express()

  // app.use((req: any, res, next) => {
  //   // 线上Worker已经注入req.dbPool就复用；本地环境没有，加载本地连接池
  //   if (!req.dbPool) {
  //     req.dbPool = getPool()
  //   }
  //   next()
  // })

  // CORS 跨域配置
  const defaultCorsOrigins = ['http://localhost:3000', 'http://localhost:3001']
  const configuredCorsOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) || []
  const corsOrigins = new Set([...defaultCorsOrigins, ...configuredCorsOrigins])
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser requests without an Origin header, and explicitly
        // validate browser origins against the normalized development list.
        if (!origin || corsOrigins.has(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`CORS origin not allowed: ${origin}`))
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


  // 静态文件服务（上传的图片）
  // app.use('/uploads', express.static('uploads'))

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
