import https from 'https'

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
 * 优先使用 Claude API，失败时降级到规则解析
 */
export async function parseUserQuery(query: string): Promise<ParsedCriteria> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // 如果没有配置 API Key，直接使用规则解析
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY not configured, using rule-based parsing')
    return parseWithRules(query)
  }

  // 尝试使用 Claude API
  try {
    const result = await parseWithClaude(query, apiKey)
    console.log('Successfully parsed with Claude API:', result)
    return result
  } catch (error) {
    console.warn('Claude API failed, falling back to rule-based parsing:', error)
    return parseWithRules(query)
  }
}

/**
 * 使用 Claude API 解析查询
 */
async function parseWithClaude(query: string, apiKey: string): Promise<ParsedCriteria> {
  const requestBody = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `你是一个菜品推荐助手。请解析用户的点餐需求，提取关键信息。

用户需求："${query}"

请返回 JSON 格式（只返回 JSON，不要其他内容）：
{
  "maxPrice": 最高价格（数字，如果没有提到则不设置）,
  "keywords": ["菜品关键词数组"],
  "spicy": "辣度要求：no(不辣/微辣) | light(中辣) | any(可以辣/没要求)",
  "taste": ["口味标签：清淡、重口、咸、甜、酸、麻辣等"]
}

示例：
输入："推荐20元以内不辣的菜"
输出：{"maxPrice":20,"keywords":[],"spicy":"no","taste":[]}

输入："想吃清淡的面食"
输出：{"maxPrice":null,"keywords":["面"],"spicy":"any","taste":["清淡"]}

现在请解析用户需求。`
      }
    ]
  })

  return new Promise((resolve, reject) => {
    // 设置 5 秒超时
    const timeout = setTimeout(() => {
      reject(new Error('Claude API timeout'))
    }, 5000)

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
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

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        clearTimeout(timeout)

        try {
          const response = JSON.parse(data)

          // 检查错误响应
          if (response.error) {
            reject(new Error(`Claude API error: ${response.error.message}`))
            return
          }

          // 提取文本内容
          const content = response.content?.[0]?.text
          if (!content) {
            reject(new Error('No content in Claude response'))
            return
          }

          // 解析 JSON（移除可能的 markdown 代码块标记）
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            reject(new Error('No JSON found in Claude response'))
            return
          }

          const parsed = JSON.parse(jsonMatch[0])

          // 标准化结果
          const result: ParsedCriteria = {
            maxPrice: parsed.maxPrice || undefined,
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            spicy: parsed.spicy || 'any',
            taste: Array.isArray(parsed.taste) ? parsed.taste : []
          }

          resolve(result)
        } catch (error) {
          reject(new Error(`Failed to parse Claude response: ${error}`))
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
    .replace(/推荐|想吃|要|的|什么|有|好吃|便宜|实惠|以内|左右/g, '')
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
    '馒头',
    '菜'
  ]

  for (const word of words) {
    // 如果是常见菜品关键词，或者长度 >= 2 的词，添加到关键词列表
    if (dishKeywords.some((k) => word.includes(k)) || word.length >= 2) {
      criteria.keywords!.push(word)
    }
  }

  return criteria
}
