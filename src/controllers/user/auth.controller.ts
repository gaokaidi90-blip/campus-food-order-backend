import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as authService from '../../services/auth.service.js'

/**
 * 用户注册
 */
export async function register(req: Request, res: Response) {
  try {
    const { studentId, name, phone, password } = req.body

    // 验证必填字段
    if (!studentId || !name || !phone || !password) {
      return res.status(400).json(error('请填写完整信息'))
    }

    const result = await authService.registerUser({ studentId, name, phone, password })

    res.json(success(result, '注册成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 用户登录
 */
export async function login(req: Request, res: Response) {
  try {
    const { studentId, password } = req.body

    if (!studentId || !password) {
      return res.status(400).json(error('请填写学号和密码'))
    }

    const result = await authService.loginUser(studentId, password)

    res.json(success(result, '登录成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
