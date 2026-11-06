import { Request, Response } from 'express'
import path from 'path'
import { success, error } from '../utils/response.js'
import { getImageUrl } from '../utils/file.js'

/**
 * 上传头像
 */
export function uploadAvatar(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json(error('请选择要上传的文件'))
    }

    const filename = req.file.filename
    const url = getImageUrl(filename, 'avatars')

    res.json(success({ url }, '上传成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 上传菜品图片
 */
export function uploadDish(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json(error('请选择要上传的文件'))
    }

    const filename = req.file.filename
    const url = getImageUrl(filename, 'dishes')

    res.json(success({ url }, '上传成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}

/**
 * 上传食堂图片
 */
export function uploadCanteen(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json(error('请选择要上传的文件'))
    }

    const filename = req.file.filename
    const url = getImageUrl(filename, 'canteens')

    res.json(success({ url }, '上传成功'))
  } catch (err: any) {
    res.status(400).json(error(err.message))
  }
}
