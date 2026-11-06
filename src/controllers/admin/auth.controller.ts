import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as authService from '../../services/auth.service.js'

/**
 * 管理员登录
 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json(error('请填写用户名和密码'))
    }

    const result = await authService.loginAdmin(username, password)

    res.json(success(result, '登录成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
