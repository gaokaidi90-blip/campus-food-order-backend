import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

/**
 * MySQL 连接池配置
 *
 * 使用连接池可以：
 * 1. 复用数据库连接，避免频繁创建/销毁连接的开销
 * 2. 控制并发连接数，防止数据库过载
 * 3. 自动管理连接的生命周期
 *
 * 配置说明：
 * - connectionLimit: 最大连接数为 10，适合中小型应用
 * - waitForConnections: 连接池满时等待而不是报错
 * - queueLimit: 0 表示等待队列无限制
 * - enableKeepAlive: 保持连接活跃，防止长时间空闲被断开
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'campus_food_order',
  waitForConnections: true,        // 连接池满时等待可用连接
  connectionLimit: 10,              // 最大连接数
  queueLimit: 0,                    // 等待队列无限制
  enableKeepAlive: true,            // 启用 TCP keep-alive
  keepAliveInitialDelay: 0          // 立即开始 keep-alive
})

/**
 * 测试数据库连接
 *
 * 在应用启动时调用此函数，确保数据库可正常连接
 * 如果连接失败，应用应该停止启动
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✓ 数据库连接成功')
    connection.release()
  } catch (error) {
    console.error('✗ 数据库连接失败:', error)
    throw error
  }
}
