import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { success, error, paginate } from '../../utils/response.js'
import * as canteenModel from '../../models/canteen.model.js'

/**
 * 分页查询食堂
 */
export async function getCanteens(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const keyword = req.query.keyword as string

    const { list, total } = await canteenModel.findAll({ keyword, page, pageSize })

    res.json(paginate(list, total, page, pageSize))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取食堂详情
 */
export async function getCanteenDetail(req: Request, res: Response) {
  try {
    const { id } = req.params
    const canteen = await canteenModel.findById(id)

    if (!canteen) {
      return res.status(404).json(error('食堂不存在'))
    }

    res.json(success(canteen))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 创建食堂
 */
export async function createCanteen(req: Request, res: Response) {
  try {
    const { name, description, image, address, openTime, closeTime, status } = req.body

    if (!name) {
      return res.status(400).json(error('请填写食堂名称'))
    }

    const canteenId = await canteenModel.create({
      id: uuidv4(),
      name,
      description,
      image,
      address,
      openTime,
      closeTime,
      status: status !== undefined ? status : 1
    })

    res.json(success({ id: canteenId }, '创建成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 更新食堂
 */
export async function updateCanteen(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, description, image, address, openTime, closeTime, status } = req.body

    await canteenModel.update(id, { name, description, image, address, openTime, closeTime, status })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 删除食堂
 */
export async function deleteCanteen(req: Request, res: Response) {
  try {
    const { id } = req.params
    await canteenModel.remove(id)
    res.json(success(null, '删除成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
