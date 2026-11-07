import { v4 as uuidv4 } from 'uuid'
import { hashPassword, comparePassword } from '../utils/bcrypt.js'
import { generateToken } from '../utils/jwt.js'
import * as userModel from '../models/user.model.js'
import * as adminModel from '../models/admin.model.js'

/**
 * 用户注册
 *
 * @param data - 注册数据
 * @returns 新用户信息和 JWT token
 */
export async function registerUser(data: {
  studentId: string
  name: string
  phone: string
  password: string
}): Promise<{ user: userModel.User; token: string }> {
  // 检查学号是否已存在
  const existing = await userModel.findByStudentId(data.studentId)
  if (existing) {
    throw new Error('学号已被注册')
  }

  // 哈希密码
  const hashedPassword = await hashPassword(data.password)

  // 创建用户
  const userId = uuidv4()
  await userModel.create({
    id: userId,
    studentId: data.studentId,
    name: data.name,
    phone: data.phone,
    password: hashedPassword
  })

  // 查询完整用户信息
  const user = await userModel.findById(userId)
  if (!user) {
    throw new Error('用户创建失败')
  }

  // 生成 JWT token
  const token = generateToken({
    userId: user.id,
    studentId: user.studentId,
    type: 'user'
  })

  return { user, token }
}

/**
 * 用户登录
 *
 * @param studentId - 学号
 * @param password - 密码
 * @returns 用户信息和 JWT token
 */
export async function loginUser(studentId: string, password: string): Promise<{ user: userModel.User; token: string }> {
  // 查询用户（含密码）
  const userWithPassword = await userModel.findByStudentIdWithPassword(studentId)
  if (!userWithPassword) {
    throw new Error('学号或密码错误')
  }

  // 验证密码
  const isPasswordValid = await comparePassword(password, userWithPassword.password)
  if (!isPasswordValid) {
    throw new Error('学号或密码错误')
  }

  // 移除密码字段
  const { password: _, ...user } = userWithPassword

  // 生成 JWT token
  const token = generateToken({
    userId: user.id,
    studentId: user.studentId,
    type: 'user'
  })

  return { user, token }
}

/**
 * 管理员登录
 *
 * @param username - 用户名
 * @param password - 密码
 * @returns 管理员信息和 JWT token
 */
export async function loginAdmin(
  username: string,
  password: string
): Promise<{ admin: adminModel.Admin; token: string }> {
  // 查询管理员（含密码）
  const adminWithPassword = await adminModel.findByUsernameWithPassword(username)
  if (!adminWithPassword) {
    throw new Error('用户名或密码错误')
  }

  // 验证密码
  const isPasswordValid = await comparePassword(password, adminWithPassword.password)
  if (!isPasswordValid) {
    throw new Error('用户名或密码错误')
  }

  // 移除密码字段
  const { password: _, ...admin } = adminWithPassword

  // 生成 JWT token
  const token = generateToken({
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
    canteenId: admin.canteenId,  // 新增：包含食堂 ID
    type: 'admin'
  })

  return { admin, token }
}
