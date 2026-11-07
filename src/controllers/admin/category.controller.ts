import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { success, error, paginate } from '../../utils/response.js'
import * as categoryModel from '../../models/category.model.js'

/**
 * 分页查询分类
 */
export async function getCategories(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    let canteenId = req.query.canteenId as string
    const keyword = req.query.keyword as string

    // 权限控制：食堂管理员只能查看自己食堂的分类
    if (req.admin?.role === 'admin') {
      canteenId = String(req.admin.canteenId!)
    }

    const { list, total } = await categoryModel.findAll({ canteenId, keyword, page, pageSize })

    res.json(paginate(list, total, page, pageSize))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 获取分类详情
 */
export async function getCategoryDetail(req: Request, res: Response) {
  try {
    const { id } = req.params
    const category = await categoryModel.findById(id)

    if (!category) {
      return res.status(404).json(error('分类不存在'))
    }

    // 权限控制：食堂管理员只能查看自己食堂的分类
    if (req.admin?.role === 'admin' && category.canteenId !== String(req.admin.canteenId)) {
      return res.status(403).json(error('无权访问此分类'))
    }

    res.json(success(category))
  } catch (err: any) {
    res.status(500).json(error(err.message))
  }
}

/**
 * 创建分类
 */
export async function createCategory(req: Request, res: Response) {
  try {
    let { canteenId, name, sort } = req.body

    // 权限控制：食堂管理员只能在自己的食堂创建分类
    if (req.admin?.role === 'admin') {
      canteenId = String(req.admin.canteenId!)
    }

    if (!canteenId || !name) {
      return res.status(400).json(error('请填写完整信息'))
    }

    const categoryId = await categoryModel.create({
      id: uuidv4(),
      canteenId,
      name,
      sort: sort || 0
    })

    res.json(success({ id: categoryId }, '创建成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 更新分类
 */
export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, sort } = req.body

    // 权限控制：食堂管理员只能更新自己食堂的分类
    if (req.admin?.role === 'admin') {
      const category = await categoryModel.findById(id)
      if (!category) {
        return res.status(404).json(error('分类不存在'))
      }
      if (category.canteenId !== String(req.admin.canteenId)) {
        return res.status(403).json(error('无权修改此分类'))
      }
    }

    await categoryModel.update(id, { name, sort })

    res.json(success(null, '更新成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 删除分类
 */
export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params

    // 权限控制：食堂管理员只能删除自己食堂的分类
    if (req.admin?.role === 'admin') {
      const category = await categoryModel.findById(id)
      if (!category) {
        return res.status(404).json(error('分类不存在'))
      }
      if (category.canteenId !== String(req.admin.canteenId)) {
        return res.status(403).json(error('无权删除此分类'))
      }
    }

    await categoryModel.remove(id)
    res.json(success(null, '删除成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
