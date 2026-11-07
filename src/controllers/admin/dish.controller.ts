import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { success, error, paginate } from '../../utils/response.js'
import * as dishModel from '../../models/dish.model.js'

/**
 * 分页查询菜品
 */
export async function getDishes(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    let canteenId = req.query.canteenId as string
    const categoryId = req.query.categoryId as string
    const keyword = req.query.keyword as string

    // 权限控制：食堂管理员只能查看自己食堂的菜品
    if (req.admin?.role === 'admin') {
      canteenId = String(req.admin.canteenId!)
    }

    const { list, total } = await dishModel.findAll({ canteenId, categoryId, keyword, page, pageSize })

    res.json(paginate(list, total, page, pageSize))
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

    // 权限控制：食堂管理员只能查看自己食堂的菜品
    if (req.admin?.role === 'admin' && dish.canteenId !== String(req.admin.canteenId)) {
      return res.status(403).json(error('无权访问此菜品'))
    }

    res.json(success(dish))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 创建菜品
 */
export async function createDish(req: Request, res: Response) {
  try {
    let { canteenId, categoryId, name, description, image, price, originalPrice, stock, status, specifications } =
      req.body

    // 权限控制：食堂管理员只能在自己的食堂创建菜品
    if (req.admin?.role === 'admin') {
      canteenId = String(req.admin.canteenId!)
    }

    if (!canteenId || !categoryId || !name || !price) {
      return res.status(400).json(error('请填写完整信息'))
    }

    const dishId = await dishModel.create({
      id: uuidv4(),
      canteenId,
      categoryId,
      name,
      description,
      image,
      price,
      originalPrice,
      stock: stock || 100,
      status: status !== undefined ? status : 1,
      specifications
    })

    res.json(success({ id: dishId }, '创建成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 更新菜品
 */
export async function updateDish(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { categoryId, name, description, image, price, originalPrice, stock, status, specifications } = req.body

    // 权限控制：食堂管理员只能更新自己食堂的菜品
    if (req.admin?.role === 'admin') {
      const dish = await dishModel.findById(id)
      if (!dish) {
        return res.status(404).json(error('菜品不存在'))
      }
      if (dish.canteenId !== String(req.admin.canteenId)) {
        return res.status(403).json(error('无权修改此菜品'))
      }
    }

    await dishModel.update(id, {
      categoryId,
      name,
      description,
      image,
      price,
      originalPrice,
      stock,
      status,
      specifications
    })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 删除菜品
 */
export async function deleteDish(req: Request, res: Response) {
  try {
    const { id } = req.params

    // 权限控制：食堂管理员只能删除自己食堂的菜品
    if (req.admin?.role === 'admin') {
      const dish = await dishModel.findById(id)
      if (!dish) {
        return res.status(404).json(error('菜品不存在'))
      }
      if (dish.canteenId !== String(req.admin.canteenId)) {
        return res.status(403).json(error('无权删除此菜品'))
      }
    }

    await dishModel.remove(id)
    res.json(success(null, '删除成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
