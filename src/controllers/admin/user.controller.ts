import { Request, Response } from 'express'
import { success, error, paginate } from '../../utils/response.js'
import * as userModel from '../../models/user.model.js'

/**
 * 分页查询用户
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const keyword = req.query.keyword as string

    const { users, total } = await userModel.findAll({ keyword, page, pageSize })

    res.json(paginate(users, total, page, pageSize))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取用户详情
 */
export async function getUserDetail(req: Request, res: Response) {
  try {
    const { id } = req.params
    const user = await userModel.findById(id)

    if (!user) {
      return res.status(404).json(error('用户不存在'))
    }

    res.json(success(user))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, avatar } = req.body

    await userModel.update(id, { name, avatar })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
