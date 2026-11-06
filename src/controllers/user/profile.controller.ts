import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as userModel from '../../models/user.model.js'

/**
 * 获取个人信息
 */
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.userId

    const user = await userModel.findById(userId)
    if (!user) {
      return res.status(404).json(error('用户不存在'))
    }

    res.json(success(user))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 更新个人信息
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { name, avatar } = req.body

    await userModel.update(userId, { name, avatar })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
