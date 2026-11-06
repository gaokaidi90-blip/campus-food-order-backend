/**
 * 统一响应格式
 *
 * 所有 API 返回都应该遵循此格式
 * 便于前端统一处理响应
 */
export interface Res<T = any> {
  code: number      // 状态码：200 成功，其他为错误
  message: string   // 提示信息
  data: T           // 业务数据
}

/**
 * 分页响应格式
 *
 * 用于列表查询，包含数据和分页信息
 */
export interface PageRes<T> {
  list: T[]         // 数据列表
  total: number     // 总记录数
  page?: number     // 当前页码（可选）
  pageSize?: number // 每页数量（可选）
}

/**
 * 成功响应
 *
 * @param data - 业务数据
 * @param message - 提示信息，默认 'success'
 * @returns 标准响应格式
 *
 * @example
 * return res.json(success(user, '登录成功'))
 */
export function success<T>(data: T, message = 'success'): Res<T> {
  return {
    code: 200,
    message,
    data
  }
}

/**
 * 失败响应
 *
 * @param message - 错误信息
 * @param code - 错误码，默认 400
 * @returns 标准错误响应
 *
 * @example
 * return res.status(400).json(error('用户名或密码错误'))
 */
export function error(message: string, code = 400): Res<null> {
  return {
    code,
    message,
    data: null
  }
}

/**
 * 分页响应
 *
 * @param list - 数据列表
 * @param total - 总记录数
 * @param page - 当前页码（可选）
 * @param pageSize - 每页数量（可选）
 * @returns 带分页信息的响应
 *
 * @example
 * return res.json(paginate(users, 100, 1, 10))
 */
export function paginate<T>(list: T[], total: number, page?: number, pageSize?: number): Res<PageRes<T>> {
  return success({
    list,
    total,
    ...(page !== undefined && { page }),
    ...(pageSize !== undefined && { pageSize })
  })
}
