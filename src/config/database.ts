import { AsyncLocalStorage } from 'node:async_hooks'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

type Pool = mysql.Pool
const requestPoolStorage = new AsyncLocalStorage<Pool>()
let localPool: Pool | null = null

function createHyperdrivePool(hyperdrive: any): Pool {
  return mysql.createPool({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    disableEval: true,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+08:00', // 设置为北京时间
  })
}

/**
 * 为当前 Worker 请求创建独立连接池。Hyperdrive 自己负责复用底层数据库连接；
 * 请求结束后关闭 mysql2 客户端，避免跨 Worker 请求复用 I/O 对象。
 */
export async function withHyperdrivePool<T>(
  hyperdrive: any,
  callback: () => Promise<T>,
): Promise<T> {
  if (!hyperdrive) {
    throw new Error('缺少 HYPERDRIVE 数据库绑定')
  }

  const pool = createHyperdrivePool(hyperdrive)
  return requestPoolStorage.run(pool, async () => {
    try {
      return await callback()
    } finally {
      await pool.end()
    }
  })
}

/** 获取当前请求的 Hyperdrive 池；本地开发时使用 .env 连接池。 */
export function getPool(): Pool {
  const requestPool = requestPoolStorage.getStore()
  if (requestPool) {
    return requestPool
  }

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
      keepAliveInitialDelay: 0,
      timezone: '+08:00', // 设置为北京时间
    })
  }
  return localPool
}

export async function testConnection() {
  const pool = getPool()
  try {
    const connection = await pool.getConnection()
    console.log('✓ 数据库连接成功')
    connection.release()
  } catch (error) {
    console.error('✗ 数据库连接失败:', error)
    throw error
  }
}
