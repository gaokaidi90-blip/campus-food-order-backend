import { pool } from '../src/config/database.js'
import { hashPassword } from '../src/utils/bcrypt.js'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

/**
 * 数据库种子脚本
 *
 * 填充初始测试数据：
 * - 管理员账号
 * - 测试用户
 * - 食堂、分类、菜品
 * - 默认地址
 *
 * 执行方式：pnpm seed
 */

async function seed() {
  const connection = await pool.getConnection()

  try {
    console.log('开始填充数据...')

    // 1. 创建管理员（密码已加密）
    const adminId1 = uuidv4()
    const adminId2 = uuidv4()
    const adminId3 = uuidv4()
    const adminPassword = await hashPassword('admin123')
    const superPassword = await hashPassword('super123')

    // 注意：需要先创建食堂，才能关联管理员
    // 临时先创建食堂
    const canteenIds = []
    const canteens = [
      { name: '第一食堂', desc: '提供各类中式餐饮', addr: '校园东区' },
      { name: '第二食堂', desc: '以西式快餐为主', addr: '校园西区' },
      { name: '第三食堂', desc: '特色小吃和地方菜', addr: '校园南区' }
    ]

    for (const canteen of canteens) {
      const canteenId = uuidv4()
      canteenIds.push(canteenId)
      await connection.query(
        `INSERT INTO canteens (id, name, description, address, open_time, close_time, status)
         VALUES (?, ?, ?, ?, '07:00', '20:00', 1)`,
        [canteenId, canteen.name, canteen.desc, canteen.addr]
      )
    }
    console.log('✓ 食堂创建成功（3 个）')

    // 创建管理员并关联食堂
    await connection.query(
      `INSERT INTO admins (id, username, password, name, phone, role, canteen_id) VALUES
       (?, 'superadmin', ?, '超级管理员', '13800000000', 'superadmin', NULL),
       (?, 'admin1', ?, '第一食堂管理员', '13800000001', 'admin', ?),
       (?, 'admin2', ?, '第二食堂管理员', '13800000002', 'admin', ?)`,
      [adminId1, superPassword, adminId2, adminPassword, canteenIds[0], adminId3, adminPassword, canteenIds[1]]
    )
    console.log('✓ 管理员创建成功')
    console.log('  - superadmin/super123 (超级管理员，管理所有食堂)')
    console.log('  - admin1/admin123 (第一食堂管理员)')
    console.log('  - admin2/admin123 (第二食堂管理员)')

    // 2. 创建测试用户（密码统一为 123456）
    const userPassword = await hashPassword('123456')
    const userIds = []
    for (let i = 1; i <= 5; i++) {
      const userId = uuidv4()
      userIds.push(userId)
      await connection.query(
        `INSERT INTO users (id, student_id, name, phone, password) VALUES (?, ?, ?, ?, ?)`,
        [userId, `202100${i}`, `测试用户${i}`, `1380000010${i}`, userPassword]
      )
    }
    console.log('✓ 用户创建成功（学号 2021001-2021005，密码 123456）')

    // 3. 食堂已在步骤1中创建

    // 4. 创建分类
    const categoryIds: string[] = []
    const categories = [
      { name: '热菜', canteenIndex: 0 },
      { name: '凉菜', canteenIndex: 0 },
      { name: '主食', canteenIndex: 0 },
      { name: '汉堡', canteenIndex: 1 },
      { name: '披萨', canteenIndex: 1 },
      { name: '饮料', canteenIndex: 1 },
      { name: '面食', canteenIndex: 2 },
      { name: '小吃', canteenIndex: 2 },
      { name: '甜品', canteenIndex: 2 },
      { name: '汤品', canteenIndex: 2 }
    ]

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]
      const categoryId = uuidv4()
      categoryIds.push(categoryId)
      await connection.query(
        `INSERT INTO categories (id, canteen_id, name, sort) VALUES (?, ?, ?, ?)`,
        [categoryId, canteenIds[cat.canteenIndex], cat.name, i]
      )
    }
    console.log('✓ 分类创建成功（10 个）')

    // 5. 创建菜品
    const dishes = [
      // 第一食堂 - 热菜
      { name: '宫保鸡丁', cat: 0, price: 15.00, desc: '经典川菜，麻辣鲜香' },
      { name: '鱼香肉丝', cat: 0, price: 14.00, desc: '酸甜开胃' },
      { name: '红烧肉', cat: 0, price: 18.00, desc: '肥而不腻' },
      // 第一食堂 - 凉菜
      { name: '凉拌黄瓜', cat: 1, price: 8.00, desc: '清爽解腻' },
      { name: '拍黄瓜', cat: 1, price: 8.00, desc: '蒜香浓郁' },
      // 第一食堂 - 主食
      { name: '米饭', cat: 2, price: 2.00, desc: '香喷喷的白米饭' },
      { name: '馒头', cat: 2, price: 1.50, desc: '松软可口' },
      // 第二食堂 - 汉堡
      { name: '牛肉汉堡', cat: 3, price: 20.00, desc: '100%纯牛肉' },
      { name: '鸡肉汉堡', cat: 3, price: 18.00, desc: '香脆鸡排' },
      { name: '双层芝士堡', cat: 3, price: 25.00, desc: '双倍芝士' },
      // 第二食堂 - 披萨
      { name: '夏威夷披萨', cat: 4, price: 35.00, desc: '菠萝火腿' },
      { name: '海鲜披萨', cat: 4, price: 40.00, desc: '鲜虾鱿鱼' },
      // 第二食堂 - 饮料
      { name: '可乐', cat: 5, price: 5.00, desc: '冰镇可乐' },
      { name: '橙汁', cat: 5, price: 8.00, desc: '鲜榨橙汁' },
      // 第三食堂 - 面食
      { name: '牛肉拉面', cat: 6, price: 16.00, desc: '手工拉面' },
      { name: '刀削面', cat: 6, price: 15.00, desc: '山西特色' },
      { name: '炒面', cat: 6, price: 14.00, desc: '干炒牛河' },
      // 第三食堂 - 小吃
      { name: '煎饺', cat: 7, price: 10.00, desc: '香脆可口' },
      { name: '小笼包', cat: 7, price: 12.00, desc: '汁多肉嫩' },
      { name: '春卷', cat: 7, price: 8.00, desc: '酥脆金黄' },
      // 第三食堂 - 甜品
      { name: '红豆沙', cat: 8, price: 8.00, desc: '香甜细腻' },
      { name: '芒果布丁', cat: 8, price: 10.00, desc: '果香浓郁' },
      // 第三食堂 - 汤品
      { name: '西红柿蛋汤', cat: 9, price: 6.00, desc: '开胃下饭' },
      { name: '紫菜蛋花汤', cat: 9, price: 6.00, desc: '清淡鲜美' }
    ]

    for (const dish of dishes) {
      const dishId = uuidv4()
      const categoryId = categoryIds[dish.cat]
      const canteenId = canteenIds[categories[dish.cat].canteenIndex]

      await connection.query(
        `INSERT INTO dishes (id, canteen_id, category_id, name, description, price, stock, sales, status)
         VALUES (?, ?, ?, ?, ?, ?, 100, 0, 1)`,
        [dishId, canteenId, categoryId, dish.name, dish.desc, dish.price]
      )
    }
    console.log('✓ 菜品创建成功（24 个）')

    // 6. 为每个用户创建默认地址
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]
      const addressId = uuidv4()
      await connection.query(
        `INSERT INTO addresses (id, user_id, name, phone, address, building, room, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          addressId,
          userId,
          `测试用户${i + 1}`,
          `1380000010${i + 1}`,
          '校园宿舍区',
          `${i + 1}号楼`,
          `${(i + 1) * 100 + 1}室`
        ]
      )
    }
    console.log('✓ 地址创建成功（每用户 1 个默认地址）')

    console.log('\n✓ 数据填充完成！')
    console.log('\n测试账号：')
    console.log('管理员: admin / admin123')
    console.log('超级管理员: superadmin / super123')
    console.log('用户: 2021001-2021005 / 123456')
  } catch (error) {
    console.error('✗ 数据填充失败:', error)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

// 执行种子脚本
seed()
