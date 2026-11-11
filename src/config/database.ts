import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

type Pool = mysql.Pool
let localPool: Pool | null = null
let hyperPool: Pool | null = null

export function getPool(hyperdrive?: any) {
  // 线上 Hyperdrive 环境
  if (hyperdrive) {
    if (!hyperPool) {
      hyperPool = mysql.createPool({
        host: hyperdrive.host,
        port: hyperdrive.port,
        user: hyperdrive.user,
        password: hyperdrive.password,
        database: hyperdrive.database,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      })
    }
    return hyperPool
  }

  // 本地 .env 环境
  if (!localPool) {
    localPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'campus_food_order',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    })
  }
  return localPool
}

export async function testConnection(hyperdrive?: any) {
  const p = getPool(hyperdrive)
  try {
    const connection = await p.getConnection()
    console.log('✓ 数据库连接成功')
    connection.release()
  } catch (error) {
    console.error('✗ 数据库连接失败:', error)
    throw error
  }
}


