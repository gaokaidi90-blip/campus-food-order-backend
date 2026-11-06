import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { success, error } from '../../utils/response.js'
import * as addressModel from '../../models/address.model.js'

/**
 * 获取地址列表
 */
export async function getAddresses(req: Request, res: Response) {
  try {
    const userId = req.user!.userId

    const addresses = await addressModel.findByUserId(userId)

    res.json(success(addresses))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 创建地址
 */
export async function createAddress(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { name, phone, address, building, room, isDefault } = req.body

    if (!name || !phone || !address || !building || !room) {
      return res.status(400).json(error('请填写完整地址信息'))
    }

    const addressId = await addressModel.create({
      id: uuidv4(),
      userId,
      name,
      phone,
      address,
      building,
      room,
      isDefault: isDefault ? 1 : 0
    })

    res.json(success({ id: addressId }, '添加成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 更新地址
 */
export async function updateAddress(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { name, phone, address, building, room, isDefault } = req.body

    await addressModel.update(id, userId, {
      name,
      phone,
      address,
      building,
      room,
      isDefault: isDefault !== undefined ? (isDefault ? 1 : 0) : undefined
    })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 删除地址
 */
export async function deleteAddress(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const { id } = req.params

    await addressModel.remove(id, userId)

    res.json(success(null, '删除成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
