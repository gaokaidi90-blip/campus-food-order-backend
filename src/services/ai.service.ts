import https from 'https'

// 判断使用哪个 AI 服务
const AI_PROVIDER = process.env.AI_PROVIDER || 'aliyun' // 'anthropic' | 'aliyun'

/**
 * 通用 AI 请求函数
 */
async function callAI(prompt: string, maxTokens: number = 500): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('API Key not configured')
  }

  if (AI_PROVIDER === 'aliyun') {
    // 阿里百炼 API（OpenAI 兼容格式）
    return callAliyunAI(apiKey, prompt, maxTokens)
  } else {
    // Anthropic API
    return callAnthropicAI(apiKey, prompt, maxTokens)
  }
}

/**
 * 调用阿里百炼 API
 */
async function callAliyunAI(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const requestBody = JSON.stringify({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens
  })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timeout')), 15000)

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        clearTimeout(timeout)
        try {
          const response = JSON.parse(data)
          if (response.error) {
            reject(new Error(response.error.message || 'API Error'))
            return
          }
          const content = response.choices?.[0]?.message?.content
          if (!content) {
            reject(new Error('No content in response'))
            return
          }
          resolve(content)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    req.write(requestBody)
    req.end()
  })
}

/**
 * 调用 Anthropic API
 */
async function callAnthropicAI(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const apiBaseUrl = process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com'
  const requestBody = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timeout')), 15000)
    const url = new URL(apiBaseUrl)

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        clearTimeout(timeout)
        try {
          const response = JSON.parse(data)
          if (response.error) {
            reject(new Error(response.error.message))
            return
          }
          const content = response.content?.[0]?.text
          if (!content) {
            reject(new Error('No content in response'))
            return
          }
          resolve(content)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    req.write(requestBody)
    req.end()
  })
}

/**
 * AI 解析的筛选条件
 */
export interface ParsedCriteria {
  maxPrice?: number
  keywords?: string[]
  spicy?: 'no' | 'light' | 'any'
  taste?: string[]
}

/**
 * 解析用户查询
 * 优先使用 AI API，失败时降级到规则解析
 */
export async function parseUserQuery(query: string): Promise<ParsedCriteria> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // 如果没有配置 API Key，直接使用规则解析
  if (!apiKey) {
    console.log('API Key not configured, using rule-based parsing')
    return parseWithRules(query)
  }

  // 尝试使用 AI API
  try {
    const prompt = `你是一个菜品推荐助手。请解析用户的点餐需求，提取关键信息。

用户需求："${query}"

请返回 JSON 格式（只返回 JSON，不要其他内容）：
{
  "maxPrice": 最高价格（数字，如果没有提到则不设置）,
  "keywords": ["菜品关键词数组"],
  "spicy": "辣度要求：no(不辣/微辣) | light(中辣) | any(可以辣/没要求)",
  "taste": ["口味标签：清淡、重口、咸、甜、酸、麻辣等"]
}

关键规则（必须严格遵守）：
1. 价格处理：
   - "20元以内"、"20元以下" → maxPrice: 20
   - "15元以上" → 不设置 maxPrice（返回 null）
   - 看到"以上"就忽略价格

2. 关键词提取（非常重要）：
   - 只提取具体菜品名：面、鸡、鱼、豆腐、土豆
   - 绝对不要提取：菜、以上、以下、好吃、便宜、喜欢、吃
   - "女生喜欢吃的菜" → keywords: []（无具体菜品名）
   - "想吃鸡肉" → keywords: ["鸡"]

3. 语义理解场景（这些不提取关键词，让后续 AI 推荐）：
   - "女生喜欢的"、"便宜又好吃"、"适合减肥" → keywords: []

示例：
输入："推荐20元以内不辣的菜"
输出：{"maxPrice":20,"keywords":[],"spicy":"no","taste":[]}

输入："15元以上的菜"
输出：{"keywords":[],"spicy":"any","taste":[]}

输入："女生喜欢吃的菜"
输出：{"keywords":[],"spicy":"any","taste":[]}

输入："想吃清淡的面食"
输出：{"keywords":["面"],"spicy":"any","taste":["清淡"]}

现在请解析用户需求。`

    const content = await callAI(prompt, 300)

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 标准化结果
    const result: ParsedCriteria = {
      maxPrice: parsed.maxPrice || undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      spicy: parsed.spicy || 'any',
      taste: Array.isArray(parsed.taste) ? parsed.taste : []
    }

    console.log('Successfully parsed with AI:', result)
    return result
  } catch (error) {
    console.warn('AI parsing failed, falling back to rule-based parsing:', error)
    return parseWithRules(query)
  }
}

/**
 * 使用规则解析查询（降级方案）
 */
function parseWithRules(query: string): ParsedCriteria {
  const criteria: ParsedCriteria = {
    spicy: 'any',
    keywords: [],
    taste: []
  }

  // 1. 提取价格
  const pricePatterns = [
    /(\d+)\s*元/,
    /(\d+)\s*块/,
    /(\d+)\s*钱/,
    /(十|二十|三十|四十|五十)\s*元/,
    /(十|二十|三十|四十|五十)\s*块/
  ]

  for (const pattern of pricePatterns) {
    const match = query.match(pattern)
    if (match) {
      const priceStr = match[1]
      // 处理中文数字
      const chineseNumbers: Record<string, number> = {
        十: 10,
        二十: 20,
        三十: 30,
        四十: 40,
        五十: 50
      }
      criteria.maxPrice = chineseNumbers[priceStr] || parseInt(priceStr)
      break
    }
  }

  // 2. 判断辣度
  if (query.includes('不辣') || query.includes('不要辣') || query.includes('微辣')) {
    criteria.spicy = 'no'
  } else if (query.includes('中辣') || query.includes('适中')) {
    criteria.spicy = 'light'
  } else if (query.includes('辣') || query.includes('麻辣')) {
    criteria.spicy = 'any'
  }

  // 3. 提取口味标签
  const tasteKeywords = ['清淡', '重口', '咸', '甜', '酸', '麻辣', '香辣', '鲜', '嫩', '爽口']
  for (const taste of tasteKeywords) {
    if (query.includes(taste)) {
      criteria.taste!.push(taste)
    }
  }

  // 4. 提取关键词
  // 移除价格、辣度、口味等结构化信息，剩余的作为关键词
  let cleanQuery = query
    .replace(/\d+\s*[元块钱]/g, '')
    .replace(/不?辣|微辣|中辣|麻辣|香辣/g, '')
    .replace(/清淡|重口|咸|甜|酸|鲜|嫩|爽口/g, '')
    .replace(/推荐|想吃|要|的|什么|有|好吃|便宜|实惠|以内|左右|多|几|个|些|点|来|给|我|一|下/g, '')
    .trim()

  // 分词
  const words = cleanQuery.split(/[，。、\s]+/).filter((w) => w.length > 0)

  // 常见菜品关键词
  const dishKeywords = [
    '面',
    '饭',
    '汤',
    '鸡',
    '鱼',
    '肉',
    '猪',
    '牛',
    '羊',
    '虾',
    '蛋',
    '豆腐',
    '青菜',
    '土豆',
    '茄子',
    '西红柿',
    '盖浇饭',
    '炒饭',
    '面条',
    '米饭',
    '粥',
    '包子',
    '饺子',
    '馒头'
  ]

  // 无意义的通用词列表
  const stopWords = ['菜', '东西', '食物', '吃的', '小吃']

  for (const word of words) {
    // 跳过停用词
    if (stopWords.includes(word)) {
      continue
    }
    // 如果是常见菜品关键词，或者长度 >= 2 的词，添加到关键词列表
    if (dishKeywords.some((k) => word.includes(k)) || word.length >= 2) {
      criteria.keywords!.push(word)
    }
  }

  return criteria
}

/**
 * 使用 AI 从候选菜品中智能推荐
 * @param query 用户原始查询
 * @param dishes 候选菜品列表（已经过基础条件筛选）
 * @param limit 推荐数量上限
 */
export async function smartRecommend(
  query: string,
  dishes: any[],
  limit: number = 20
): Promise<any[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // 如果没有配置 API Key，或候选菜品过少，直接返回
  if (!apiKey || dishes.length <= limit) {
    return dishes.slice(0, limit)
  }

  // 如果候选菜品过多，限制发送给 AI 的数量（避免 token 超限）
  const candidateDishes = dishes.slice(0, 100)

  // 构建菜品列表文本
  const dishesText = candidateDishes
    .map((dish, index) => {
      return `${index + 1}. ${dish.name} - ¥${dish.price}${dish.description ? ` (${dish.description})` : ''}`
    })
    .join('\n')

  const prompt = `你是一个菜品推荐助手。用户说："${query}"

以下是候选菜品列表：
${dishesText}

请根据用户需求，从候选列表中挑选最合适的菜品（最多 ${limit} 个），按推荐度从高到低排序。

注意：
- "女生喜欢"：推荐清淡、健康、小份的菜品
- "便宜又好吃"：推荐性价比高、评价好的菜品
- "适合减肥"：推荐低卡、蔬菜类、清淡的菜品
- 只返回菜品编号的 JSON 数组，格式：[1, 3, 5]，不要其他内容`

  try {
    const content = await callAI(prompt, 500)

    // 提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) {
      throw new Error('No array found in AI response')
    }

    const recommendedIndices = JSON.parse(jsonMatch[0]) as number[]

    // 根据推荐的索引返回菜品
    const result: any[] = []
    for (const index of recommendedIndices) {
      if (index >= 1 && index <= candidateDishes.length) {
        result.push(candidateDishes[index - 1])
      }
    }

    console.log(`AI smart recommend: ${result.length} dishes from ${candidateDishes.length} candidates`)
    return result.length > 0 ? result : candidateDishes.slice(0, limit)
  } catch (error) {
    console.warn('AI smart recommend failed, using original order:', error)
    return candidateDishes.slice(0, limit)
  }
}

/**
 * 个性化推荐：基于用户历史订单分析偏好
 * @param userOrders 用户历史订单列表
 * @param allDishes 所有可用菜品
 * @param limit 推荐数量
 */
export async function personalizedRecommend(
  userOrders: any[],
  allDishes: any[],
  limit: number = 10
): Promise<any[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // 如果没有 API Key 或订单历史为空，返回默认推荐
  if (!apiKey || userOrders.length === 0) {
    return allDishes.slice(0, limit)
  }

  // 提取历史订单中的菜品
  const orderedDishes: { [key: string]: number } = {}
  for (const order of userOrders.slice(0, 20)) {
    // 只看最近 20 个订单
    for (const item of order.items || []) {
      orderedDishes[item.dishName] = (orderedDishes[item.dishName] || 0) + 1
    }
  }

  // 构建历史订单文本
  const historyText = Object.entries(orderedDishes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => `${name}(点过${count}次)`)
    .join('、')

  // 构建候选菜品列表
  const candidateDishes = allDishes.slice(0, 50)
  const dishesText = candidateDishes
    .map((dish, index) => `${index + 1}. ${dish.name} - ¥${dish.price}`)
    .join('\n')

  const prompt = `你是一个菜品推荐助手。根据用户的历史订单，推荐他可能喜欢的菜品。

用户历史偏好：${historyText}

候选菜品列表：
${dishesText}

请分析用户口味偏好（如：喜欢肉类/素菜、辣/不辣、价格区间等），然后从候选列表中挑选 ${limit} 个最适合的菜品，按推荐度排序。

只返回菜品编号的 JSON 数组，格式：[1, 3, 5]，不要其他内容`

  try {
    const content = await callAI(prompt, 500)

    // 提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) {
      throw new Error('No array found in AI response')
    }

    const recommendedIndices = JSON.parse(jsonMatch[0]) as number[]

    // 根据推荐的索引返回菜品
    const result: any[] = []
    for (const index of recommendedIndices) {
      if (index >= 1 && index <= candidateDishes.length) {
        result.push(candidateDishes[index - 1])
      }
    }

    console.log(`Personalized recommend: ${result.length} dishes based on order history`)
    return result.length > 0 ? result : candidateDishes.slice(0, limit)
  } catch (error) {
    console.warn('Personalized recommend failed:', error)
    return candidateDishes.slice(0, limit)
  }
}

/**
 * 营养分析：分析菜品营养成分并给出建议
 * @param dishes 要分析的菜品列表
 */
export async function analyzeNutrition(dishes: any[]): Promise<{
  summary: string
  details: any
  suggestions: string[]
}> {
  console.log('[Nutrition Analysis] Starting...')
  console.log('[Nutrition Analysis] Dishes count:', dishes.length)

  if (dishes.length === 0) {
    return {
      summary: '无法分析营养成分',
      details: {},
      suggestions: []
    }
  }

  // 构建菜品列表文本
  const dishesText = dishes
    .map((dish) => `${dish.name}(¥${dish.price}) x ${dish.quantity || 1}`)
    .join('、')

  const prompt = `你是一个营养分析专家。请分析以下菜品的营养成分：

菜品：${dishesText}

请返回 JSON 格式（只返回 JSON，不要其他内容）：
{
  "summary": "总体营养评价（1-2句话）",
  "details": {
    "calories": "总热量估算（如：约800大卡）",
    "protein": "蛋白质评估（如：中等）",
    "carbs": "碳水化合物评估（如：偏高）",
    "fat": "脂肪评估（如：适中）",
    "fiber": "膳食纤维评估（如：偏低）"
  },
  "suggestions": [
    "建议1：如增加蔬菜摄入",
    "建议2：如注意控制油脂",
    "建议3：如搭配粗粮更健康"
  ]
}

注意：
- 根据菜品名称和常识估算营养
- 评估要客观实用
- 建议要具体可行`

  try {
    console.log('[Nutrition Analysis] Calling AI...')
    const content = await callAI(prompt, 800)
    console.log('[Nutrition Analysis] Response length:', content.length)

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Nutrition Analysis] No valid JSON in response')
      throw new Error('No valid JSON')
    }

    const result = JSON.parse(jsonMatch[0])
    console.log('[Nutrition Analysis] Success')
    return result
  } catch (error) {
    console.error('[Nutrition Analysis] Failed:', error)
    return {
      summary: '营养分析暂时不可用',
      details: {},
      suggestions: []
    }
  }
}
