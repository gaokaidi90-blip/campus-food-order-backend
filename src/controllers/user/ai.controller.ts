import type { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import { parseUserQuery } from '../../services/ai.service.js'
import { findAllActive } from '../../models/dish.model.js'
import type { Dish } from '../../models/dish.model.js'

/**
 * AI 推荐菜品
 * POST /api/user/ai-recommend
 */
export async function recommendDishes(req: Request, res: Response) {
  try {
    const { query } = req.body

    // 验证输入
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json(error('请输入查询内容', 400))
    }

    if (query.length > 200) {
      return res.status(400).json(error('查询内容过长，请控制在200字以内', 400))
    }

    // 解析用户需求
    const criteria = await parseUserQuery(query.trim())
    console.log('Parsed criteria:', criteria)

    // 获取所有活跃菜品
    const allDishes = await findAllActive({})
    console.log(`Total active dishes: ${allDishes.length}`)

    // 根据条件筛选菜品
    let filteredDishes = allDishes

    // 1. 价格过滤
    if (criteria.maxPrice !== undefined) {
      filteredDishes = filteredDishes.filter((dish) => {
        // 将价格转换为数字进行比较
        const dishPrice = typeof dish.price === 'string' ? parseFloat(dish.price) : dish.price
        return dishPrice <= criteria.maxPrice!
      })
      console.log(`After price filter (max ${criteria.maxPrice}): ${filteredDishes.length} dishes`)
    }

    // 2. 关键词匹配（菜名或描述包含关键词）
    if (criteria.keywords && criteria.keywords.length > 0) {
      const beforeCount = filteredDishes.length
      filteredDishes = filteredDishes.filter((dish) => {
        const dishText = `${dish.name} ${dish.description || ''} ${dish.specifications || ''}`.toLowerCase()
        return criteria.keywords!.some((keyword) => dishText.includes(keyword.toLowerCase()))
      })
      console.log(`After keyword filter (${criteria.keywords.join(', ')}): ${filteredDishes.length} dishes (filtered from ${beforeCount})`)
    } else {
      console.log('No keywords specified, keeping all dishes')
    }

    // 3. 辣度过滤
    if (criteria.spicy === 'no') {
      // 不辣：排除描述或规格中包含"辣"的菜品
      filteredDishes = filteredDishes.filter((dish) => {
        const dishText = `${dish.name} ${dish.description || ''} ${dish.specifications || ''}`.toLowerCase()
        // 排除包含"辣"但不包含"不辣"的菜品
        const hasSpicy = dishText.includes('辣')
        const hasNoSpicy = dishText.includes('不辣') || dishText.includes('微辣')
        return !hasSpicy || hasNoSpicy
      })
      console.log(`After spicy filter (no spicy): ${filteredDishes.length} dishes`)
    } else if (criteria.spicy === 'light') {
      // 中辣：可以包含辣，但不要太辣
      // 这里简化处理，不做额外过滤
    }

    // 4. 口味标签过滤
    if (criteria.taste && criteria.taste.length > 0) {
      filteredDishes = filteredDishes.filter((dish) => {
        const dishText = `${dish.name} ${dish.description || ''} ${dish.specifications || ''}`.toLowerCase()
        return criteria.taste!.some((taste) => dishText.includes(taste.toLowerCase()))
      })
      console.log(`After taste filter (${criteria.taste.join(', ')}): ${filteredDishes.length} dishes`)
    }

    // 5. 限制返回数量（最多 20 个）
    const resultDishes = filteredDishes.slice(0, 20)

    return res.json(
      success(resultDishes, resultDishes.length > 0 ? '推荐成功' : '没有找到符合条件的菜品')
    )
  } catch (err) {
    console.error('AI 推荐失败:', err)
    return res.status(500).json(error('推荐失败，请稍后重试', 500))
  }
}
