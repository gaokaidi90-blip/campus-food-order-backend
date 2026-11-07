import { pool } from '../src/config/database.js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * 数据库迁移脚本
 *
 * 创建所有表结构，包括：
 * - 用户和管理员表
 * - 食堂、分类、菜品表
 * - 地址、订单、订单项表
 * - 购物车表
 *
 * 执行方式：pnpm migrate
 */

async function migrate() {
  const connection = await pool.getConnection()

  try {
    console.log('开始数据库迁移...')

    // 1. 创建 users 表（学生用户）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL UNIQUE COMMENT '学号',
        name VARCHAR(50) NOT NULL COMMENT '姓名',
        phone VARCHAR(20) NOT NULL COMMENT '手机号',
        password VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希密码',
        avatar VARCHAR(500) COMMENT '头像 URL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='用户表'
    `)
    console.log('✓ users 表创建成功')

    // 2. 创建 admins 表（管理员）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id CHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
        password VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希密码',
        name VARCHAR(50) NOT NULL COMMENT '姓名',
        phone VARCHAR(20) COMMENT '手机号',
        role ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin' COMMENT '角色',
        canteen_id CHAR(36) COMMENT '关联的食堂 ID（NULL表示超级管理员）',
        avatar VARCHAR(500) COMMENT '头像 URL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_canteen_id (canteen_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='管理员表'
    `)
    console.log('✓ admins 表创建成功')

    // 3. 创建 canteens 表（食堂）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS canteens (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '食堂名称',
        description TEXT COMMENT '描述',
        image VARCHAR(500) COMMENT '图片 URL',
        address VARCHAR(255) COMMENT '地址',
        open_time VARCHAR(10) COMMENT '营业开始时间',
        close_time VARCHAR(10) COMMENT '营业结束时间',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0=停用 1=启用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='食堂表'
    `)
    console.log('✓ canteens 表创建成功')

    // 4. 创建 categories 表（分类）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id CHAR(36) PRIMARY KEY,
        canteen_id CHAR(36) NOT NULL COMMENT '所属食堂',
        name VARCHAR(50) NOT NULL COMMENT '分类名称',
        sort INT NOT NULL DEFAULT 0 COMMENT '排序权重',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE,
        INDEX idx_canteen_id (canteen_id),
        INDEX idx_sort (sort)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='分类表'
    `)
    console.log('✓ categories 表创建成功')

    // 5. 创建 dishes 表（菜品）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dishes (
        id CHAR(36) PRIMARY KEY,
        canteen_id CHAR(36) NOT NULL COMMENT '所属食堂',
        category_id CHAR(36) NOT NULL COMMENT '所属分类',
        name VARCHAR(100) NOT NULL COMMENT '菜品名称',
        description TEXT COMMENT '描述',
        image VARCHAR(500) COMMENT '图片 URL',
        price DECIMAL(10,2) NOT NULL COMMENT '价格（元）',
        original_price DECIMAL(10,2) COMMENT '原价（用于显示划线价）',
        stock INT NOT NULL DEFAULT 100 COMMENT '库存',
        sales INT NOT NULL DEFAULT 0 COMMENT '销量',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0=下架 1=上架',
        specifications VARCHAR(255) COMMENT '规格说明',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        INDEX idx_canteen_id (canteen_id),
        INDEX idx_category_id (category_id),
        INDEX idx_status (status),
        INDEX idx_stock (stock)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='菜品表'
    `)
    console.log('✓ dishes 表创建成功')

    // 6. 创建 addresses 表（收货地址）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL COMMENT '所属用户',
        name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
        phone VARCHAR(20) NOT NULL COMMENT '收货人手机号',
        address VARCHAR(255) NOT NULL COMMENT '详细地址',
        building VARCHAR(50) NOT NULL COMMENT '楼栋',
        room VARCHAR(50) NOT NULL COMMENT '房间号',
        is_default TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认：0=否 1=是',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_default (is_default)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='收货地址表'
    `)
    console.log('✓ addresses 表创建成功')

    // 7. 创建 orders 表（订单）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id CHAR(36) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
        user_id CHAR(36) NOT NULL COMMENT '下单用户',
        canteen_id CHAR(36) NOT NULL COMMENT '食堂',
        address_id CHAR(36) NOT NULL COMMENT '收货地址',
        status ENUM('pending', 'accepted', 'ready', 'cancelled') NOT NULL DEFAULT 'pending'
          COMMENT '状态：pending=待接单 accepted=已接单 ready=已完成 cancelled=已取消',
        total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额（元）',
        remark TEXT COMMENT '备注',
        cancel_reason TEXT COMMENT '取消原因',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE,
        FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE,
        INDEX idx_order_no (order_no),
        INDEX idx_user_id (user_id),
        INDEX idx_canteen_id (canteen_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='订单表'
    `)
    console.log('✓ orders 表创建成功')

    // 8. 创建 order_items 表（订单项 - 快照数据）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id CHAR(36) PRIMARY KEY,
        order_id CHAR(36) NOT NULL COMMENT '所属订单',
        dish_id CHAR(36) NOT NULL COMMENT '菜品 ID（关联用）',
        dish_name VARCHAR(100) NOT NULL COMMENT '菜品名称（快照）',
        dish_image VARCHAR(500) COMMENT '菜品图片（快照）',
        price DECIMAL(10,2) NOT NULL COMMENT '单价（快照，下单时价格）',
        quantity INT NOT NULL COMMENT '数量',
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='订单项表（保存下单时的菜品信息快照）'
    `)
    console.log('✓ order_items 表创建成功')

    // 9. 创建 cart_items 表（购物车）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL COMMENT '所属用户',
        dish_id CHAR(36) NOT NULL COMMENT '菜品',
        canteen_id CHAR(36) NOT NULL COMMENT '食堂',
        quantity INT NOT NULL DEFAULT 1 COMMENT '数量',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
        FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_dish (user_id, dish_id) COMMENT '同一用户同一菜品唯一，实现购物车合并',
        INDEX idx_user_id (user_id),
        INDEX idx_canteen_id (canteen_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='购物车表'
    `)
    console.log('✓ cart_items 表创建成功')

    // 10. 为已存在的 admins 表添加 canteen_id 字段（如果表已存在但没有该字段）
    try {
      await connection.query(`
        ALTER TABLE admins
        ADD COLUMN canteen_id CHAR(36) COMMENT '关联的食堂 ID（NULL表示超级管理员）',
        ADD INDEX idx_canteen_id (canteen_id)
      `)
      console.log('✓ admins 表添加 canteen_id 字段成功')
    } catch (error: any) {
      // 字段已存在，忽略错误
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ admins 表 canteen_id 字段已存在')
      } else {
        throw error
      }
    }

    console.log('\n✓ 数据库迁移完成！')
  } catch (error) {
    console.error('✗ 数据库迁移失败:', error)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

// 执行迁移
migrate()
