import { Router } from 'express'
import { upload } from '../utils/file.js'
import * as uploadController from '../controllers/upload.controller.js'

const router = Router()

/**
 * 文件上传路由
 *
 * 使用 multer 中间件处理 multipart/form-data
 * 文件字段名统一为 'file'
 */
router.post('/avatar', upload.single('file'), uploadController.uploadAvatar)
router.post('/dish', upload.single('file'), uploadController.uploadDish)
router.post('/canteen', upload.single('file'), uploadController.uploadCanteen)

export default router
