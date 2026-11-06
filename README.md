# Campus Food Order - Backend

校园食堂订餐系统后端服务，提供 RESTful API。

## 技术栈

- **Node.js 24+** - 运行环境
- **Express 4** - Web 框架
- **MySQL 8** - 数据库
- **TypeScript 6** - 类型安全
- **JWT** - 身份认证
- **Bcrypt** - 密码加密
- **Multer** - 文件上传

## 功能特性

- ✅ 用户注册和登录（JWT 认证）
- ✅ 管理员登录（角色权限）
- ✅ 食堂、分类、菜品管理
- ✅ 购物车增删改查
- ✅ 订单创建（事务保证库存一致性）
- ✅ 订单取消（自动恢复库存）
- ✅ 地址管理（支持默认地址）
- ✅ 图片上传（本地/OSS）
- ✅ 统计数据（仪表盘）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和 JWT 密钥：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_food_order

# JWT 密钥（生产环境请使用强密钥）
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

### 3. 创建数据库

```bash
mysql -u root -p
CREATE DATABASE campus_food_order CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

### 4. 运行数据库迁移

```bash
pnpm migrate
```

### 5. 填充种子数据

```bash
pnpm seed
```

### 6. 启动开发服务器

```bash
pnpm dev
```

服务器将在 **http://localhost:4000** 启动。

## 测试账号

### 管理员
- 用户名：`admin` / 密码：`admin123`（普通管理员）
- 用户名：`superadmin` / 密码：`super123`（超级管理员）

### 普通用户
- 学号：`2021001` - `2021005` / 密码：`123456`

## API 文档

### 基础 URL

```
http://localhost:4000/api
```

### 认证方式

需要认证的接口在请求头中携带 JWT token：

```
Authorization: Bearer <token>
```

### 用户端接口

#### 认证
- `POST /user/register` - 用户注册
- `POST /user/login` - 用户登录

#### 食堂和菜品
- `GET /user/canteens` - 获取食堂列表
- `GET /user/canteens/:id` - 获取食堂详情（含分类）
- `GET /user/dishes?canteenId=&categoryId=` - 获取菜品列表
- `GET /user/dishes/:id` - 获取菜品详情

#### 购物车（需登录）
- `GET /user/cart` - 获取购物车
- `POST /user/cart` - 添加到购物车
- `PUT /user/cart/:id` - 更新购物车项数量
- `DELETE /user/cart/:id` - 删除购物车项
- `DELETE /user/cart` - 清空购物车

#### 订单（需登录）
- `GET /user/orders?status=` - 获取订单列表
- `GET /user/orders/:id` - 获取订单详情
- `POST /user/orders` - 创建订单
- `POST /user/orders/:id/cancel` - 取消订单

#### 地址（需登录）
- `GET /user/addresses` - 获取地址列表
- `POST /user/addresses` - 创建地址
- `PUT /user/addresses/:id` - 更新地址
- `DELETE /user/addresses/:id` - 删除地址

#### 个人信息（需登录）
- `GET /user/profile` - 获取个人信息
- `PUT /user/profile` - 更新个人信息

### 管理端接口（需管理员认证）

#### 认证
- `POST /admin/login` - 管理员登录

#### 统计
- `GET /admin/stats/dashboard` - 仪表盘统计

#### 食堂管理
- `GET /admin/canteens?page=1&pageSize=10&keyword=` - 分页查询食堂
- `GET /admin/canteens/:id` - 获取食堂详情
- `POST /admin/canteens` - 创建食堂
- `PUT /admin/canteens/:id` - 更新食堂
- `DELETE /admin/canteens/:id` - 删除食堂

#### 分类管理
- `GET /admin/categories?page=1&pageSize=10&canteenId=&keyword=` - 分页查询分类
- `GET /admin/categories/:id` - 获取分类详情
- `POST /admin/categories` - 创建分类
- `PUT /admin/categories/:id` - 更新分类
- `DELETE /admin/categories/:id` - 删除分类

#### 菜品管理
- `GET /admin/dishes?page=1&pageSize=10&canteenId=&categoryId=&keyword=` - 分页查询菜品
- `GET /admin/dishes/:id` - 获取菜品详情
- `POST /admin/dishes` - 创建菜品
- `PUT /admin/dishes/:id` - 更新菜品
- `DELETE /admin/dishes/:id` - 删除菜品

#### 订单管理
- `GET /admin/orders?page=1&pageSize=10&canteenId=&status=` - 分页查询订单
- `GET /admin/orders/:id` - 获取订单详情
- `PUT /admin/orders/:id/status` - 更新订单状态

#### 用户管理
- `GET /admin/users?page=1&pageSize=10&keyword=` - 分页查询用户
- `GET /admin/users/:id` - 获取用户详情
- `PUT /admin/users/:id` - 更新用户信息

### 文件上传

- `POST /upload/avatar` - 上传头像（multipart/form-data，字段名：file）
- `POST /upload/dish` - 上传菜品图片
- `POST /upload/canteen` - 上传食堂图片

## 响应格式

所有接口统一返回以下格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

分页接口返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

## 数据库设计

### 表结构

- `users` - 用户表（学号、姓名、手机、密码）
- `admins` - 管理员表（用户名、密码、角色）
- `canteens` - 食堂表（名称、地址、营业时间）
- `categories` - 分类表（名称、排序）
- `dishes` - 菜品表（名称、价格、库存、销量）
- `addresses` - 地址表（收货人、地址、默认标记）
- `orders` - 订单表（订单号、状态、总金额）
- `order_items` - 订单项表（菜品快照、数量）
- `cart_items` - 购物车表（菜品、数量）

详细字段定义请参考 `scripts/migrate.ts`。

## 开发命令

```bash
pnpm dev          # 启动开发服务器（热重载）
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm migrate      # 运行数据库迁移
pnpm seed         # 填充种子数据
```

## 安全特性

- ✅ **JWT 认证** - 无状态身份验证
- ✅ **Bcrypt 加密** - 密码单向哈希（10 轮加盐）
- ✅ **参数化查询** - 防止 SQL 注入
- ✅ **CORS 配置** - 跨域访问控制
- ✅ **文件上传限制** - 类型和大小验证
- ✅ **权限验证** - 用户/管理员分离
- ✅ **事务保证** - 订单操作原子性

## 订单事务流程

### 创建订单
1. 验证地址归属权
2. 验证食堂存在
3. **锁定菜品行**（FOR UPDATE）
4. 验证库存和状态
5. 扣减库存、增加销量
6. 创建订单和订单项
7. 清空购物车
8. 提交事务

### 取消订单
1. **锁定订单行**（FOR UPDATE）
2. 验证订单状态（只能取消 pending/accepted）
3. 更新订单状态为 cancelled
4. 恢复库存、减少销量
5. 提交事务

## 前端配置

前端项目需要配置 Vite 代理转发 API 请求：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
```

## 部署说明

### 生产环境

1. **构建项目**

```bash
pnpm build
```

2. **设置环境变量**

```bash
# 生产环境 .env
NODE_ENV=production
PORT=4000
DB_HOST=your_db_host
DB_PASSWORD=strong_password
JWT_SECRET=strong_jwt_secret_at_least_32_characters
```

3. **运行迁移**

```bash
pnpm migrate
pnpm seed
```

4. **启动服务**

```bash
pnpm start
```

### 使用 PM2 管理进程

```bash
pm2 start dist/server.js --name campus-food-backend
pm2 save
pm2 startup
```

## 项目结构

```
campus-food-order-backend/
├── src/
│   ├── config/          # 配置（数据库连接）
│   ├── middlewares/     # 中间件（认证、错误处理）
│   ├── models/          # 数据模型（9个）
│   ├── services/        # 业务服务（认证、订单、统计）
│   ├── controllers/     # 控制器
│   │   ├── user/        # 用户端控制器
│   │   └── admin/       # 管理端控制器
│   ├── routes/          # 路由配置
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   ├── app.ts           # Express 应用
│   └── server.ts        # 服务器入口
├── scripts/             # 数据库脚本
│   ├── migrate.ts       # 建表迁移
│   └── seed.ts          # 种子数据
├── uploads/             # 文件上传目录
├── .env.example         # 环境变量模板
├── package.json
├── tsconfig.json
└── README.md
```

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保 MySQL 服务已启动。

### 2. JWT token 过期

Token 默认有效期为 7 天，过期后需要重新登录。

### 3. 文件上传失败

确保 `uploads/` 目录存在且有写入权限。

### 4. 订单创建失败

检查菜品库存是否充足，是否选择了正确的食堂和地址。

## License

MIT

---

**开发团队** | 校园食堂订餐系统
