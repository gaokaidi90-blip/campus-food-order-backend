import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'

/**
 * 确保上传目录存在
 *
 * 如果目录不存在，递归创建
 */
async function ensureDir(dir: string) {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

/**
 * Multer 存储配置
 *
 * 根据上传路径自动判断文件类别：
 * - /upload/avatar -> uploads/avatars/
 * - /upload/dish -> uploads/dishes/
 * - /upload/canteen -> uploads/canteens/
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // 根据路径判断上传类型
    let category = 'others'
    if (req.path.includes('avatar')) {
      category = 'avatars'
    } else if (req.path.includes('dish')) {
      category = 'dishes'
    } else if (req.path.includes('canteen')) {
      category = 'canteens'
    }

    const uploadDir = path.join(process.cwd(), 'uploads', category)
    await ensureDir(uploadDir)
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 使用 UUID + 原始扩展名，避免文件名冲突
    const ext = path.extname(file.originalname)
    const filename = `${uuidv4()}${ext}`
    cb(null, filename)
  }
})

/**
 * Multer 配置
 *
 * 文件限制：
 * - 大小：最大 2MB
 * - 类型：仅允许图片（image/*）
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  }
})

/**
 * 生成图片 URL
 *
 * 将本地文件路径转换为可访问的 HTTP URL
 *
 * @param filename - 文件名（UUID + 扩展名）
 * @param category - 文件类别（avatars/dishes/canteens）
 * @returns 完整的图片 URL
 *
 * @example
 * const url = getImageUrl('abc123.jpg', 'dishes')
 * // http://localhost:4000/uploads/dishes/abc123.jpg
 */
export function getImageUrl(filename: string, category: 'avatars' | 'dishes' | 'canteens'): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:4000'
  return `${baseUrl}/uploads/${category}/${filename}`
}
