import type { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import { parseUserQuery, smartRecommend, personalizedRecommend, analyzeNutrition } from '../../services/ai.service.js'
import { findAllActive } from '../../models/dish.model.js'
import type { Dish } from '../../models/dish.model.js'
import { findByUserId } from '../../models/order.model.js'

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
    // 过滤掉无意义的通用词，只保留有实际意义的关键词
    const meaningfulKeywords = criteria.keywords?.filter(
      (keyword) => !['菜', '的', '吃', '要', '推荐', '找', '有'].includes(keyword) && keyword.length >= 2
    ) || []

    if (meaningfulKeywords.length > 0) {
      const beforeCount = filteredDishes.length
      filteredDishes = filteredDishes.filter((dish) => {
        const dishText = `${dish.name} ${dish.description || ''} ${dish.specifications || ''}`.toLowerCase()
        return meaningfulKeywords.some((keyword) => dishText.includes(keyword.toLowerCase()))
      })
      console.log(`After keyword filter (${meaningfulKeywords.join(', ')}): ${filteredDishes.length} dishes (filtered from ${beforeCount})`)
    } else {
      console.log('No meaningful keywords specified, keeping all dishes')
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

    // 5. AI 智能推荐（从候选菜品中挑选最合适的）
    const recommendedDishes = await smartRecommend(query.trim(), filteredDishes, 20)
    console.log(`Final recommended dishes: ${recommendedDishes.length}`)

    // 返回推荐结果和分析条件
    return res.json(
      success(
        {
          dishes: recommendedDishes,
          criteria,
        },
        recommendedDishes.length > 0 ? '推荐成功' : '没有找到符合条件的菜品'
      )
    )
  } catch (err) {
    console.error('AI 推荐失败:', err)
    return res.status(500).json(error('推荐失败，请稍后重试', 500))
  }
}

/**
 * 个性化推荐
 * GET /api/user/personalized-recommend
 */
export async function getPersonalizedRecommend(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json(error('未登录', 401))
    }

    // 获取用户历史订单
    const orders = await findByUserId(userId)
    console.log(`User ${userId} has ${orders.length} orders`)

    // 获取所有活跃菜品
    const allDishes = await findAllActive({})

    // AI 个性化推荐
    const recommendedDishes = await personalizedRecommend(orders, allDishes, 10)

    return res.json(
      success({
        dishes: recommendedDishes,
        hasHistory: orders.length > 0
      }, '推荐成功')
    )
  } catch (err) {
    console.error('个性化推荐失败:', err)
    return res.status(500).json(error('推荐失败，请稍后重试', 500))
  }
}

/**
 * 营养分析
 * POST /api/user/nutrition-analysis
 */
export async function getNutritionAnalysis(req: Request, res: Response) {
  try {
    const { dishes } = req.body

    // 验证输入
    if (!Array.isArray(dishes) || dishes.length === 0) {
      return res.status(400).json(error('请提供要分析的菜品列表', 400))
    }

    // AI 营养分析
    const analysis = await analyzeNutrition(dishes)

    return res.json(success(analysis, '分析完成'))
  } catch (err) {
    console.error('营养分析失败:', err)
    return res.status(500).json(error('分析失败，请稍后重试', 500))
  }
}
