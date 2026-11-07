import { Request } from 'express'

/**
 * 扩展 Express Request 类型
 *
 * 在认证中间件中，会将解析后的用户/管理员信息附加到 req 对象上
 * 这里扩展类型定义，使 TypeScript 能够识别这些属性
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * 当前登录的用户信息
       *
       * 由 requireUserAuth 中间件设置
       * 仅在用户端接口中可用
       */
      user?: {
        userId: string      // 用户 ID
        studentId: string   // 学号
      }

      /**
       * 当前登录的管理员信息
       *
       * 由 requireAdminAuth 中间件设置
       * 仅在管理端接口中可用
       */
      admin?: {
        adminId: string     // 管理员 ID
        username: string    // 用户名
        role: string        // 角色（admin/superadmin）
        canteenId: number | null  // 关联的食堂 ID，NULL 表示超级管理员
      }
    }
  }
}

export {}
