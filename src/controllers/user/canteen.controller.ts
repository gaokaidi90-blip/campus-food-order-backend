import { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import * as canteenModel from '../../models/canteen.model.js'
import * as categoryModel from '../../models/category.model.js'
import * as dishModel from '../../models/dish.model.js'

/**
 * 获取食堂列表
 */
export async function getCanteens(req: Request, res: Response) {
  try {
    const canteens = await canteenModel.findAllActive()
    res.json(success(canteens))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取食堂详情（含分类）
 */
export async function getCanteenDetail(req: Request, res: Response) {
  try {
    const { id } = req.params

    const canteen = await canteenModel.findById(id)
    if (!canteen) {
      return res.status(404).json(error('食堂不存在'))
    }

    // 查询该食堂的分类
    const categories = await categoryModel.findByCanteenId(id)

    res.json(success({ ...canteen, categories }))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取菜品列表
 */
export async function getDishes(req: Request, res: Response) {
  try {
    const { canteenId, categoryId } = req.query

    const dishes = await dishModel.findAllActive({
      canteenId: canteenId as string,
      categoryId: categoryId as string
    })

    res.json(success(dishes))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取菜品详情
 */
export async function getDishDetail(req: Request, res: Response) {
  try {
    const { id } = req.params

    const dish = await dishModel.findById(id)
    if (!dish) {
      return res.status(404).json(error('菜品不存在'))
    }

    res.json(success(dish))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}
