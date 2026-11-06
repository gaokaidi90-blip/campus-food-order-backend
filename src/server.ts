import { createApp } from './app.js'
import { testConnection } from './config/database.js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const PORT = process.env.PORT || 4000

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 测试数据库连接
    await testConnection()

    // 创建 Express 应用
    const app = createApp()

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log(`\n🚀 服务器启动成功！`)
      console.log(`📍 地址: http://localhost:${PORT}`)
      console.log(`📊 健康检查: http://localhost:${PORT}/health`)
      console.log(`👤 用户端API: http://localhost:${PORT}/api/user`)
      console.log(`🔧 管理端API: http://localhost:${PORT}/api/admin\n`)
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error)
    process.exit(1)
  }
}

// 启动服务器
startServer()
