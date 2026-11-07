# 权限系统测试指南

## 测试准备

### 1. 重新初始化数据库

```bash
cd campus-food-order-backend
pnpm migrate   # 重新创建表结构（包含 canteen_id 字段）
pnpm seed      # 填充测试数据
pnpm dev       # 启动后端服务
```

### 2. 测试账号

| 账号 | 密码 | 角色 | 权限范围 |
|------|------|------|---------|
| superadmin | super123 | 超级管理员 | 所有食堂 |
| admin1 | admin123 | 食堂管理员 | 仅第一食堂 |
| admin2 | admin123 | 食堂管理员 | 仅第二食堂 |

---

## 测试场景

### 场景 1：超级管理员权限

**登录：** `superadmin / super123`

✅ **应该能看到：**
- 侧边栏显示"食堂管理"菜单
- 订单/菜品/分类页面显示食堂选择器
- 可以切换查看不同食堂的数据
- 可以访问食堂管理页面（/canteen）

✅ **测试操作：**
1. 进入订单管理，切换食堂筛选，应该能看到所有食堂的订单
2. 进入食堂管理，应该能创建/编辑/删除食堂
3. 进入菜品管理，切换食堂，应该能管理所有食堂的菜品

---

### 场景 2：食堂管理员权限（第一食堂）

**登录：** `admin1 / admin123`

✅ **应该能看到：**
- 侧边栏**不显示**"食堂管理"菜单
- 订单/菜品/分类页面**不显示**食堂选择器
- 只能看到第一食堂的数据

❌ **应该被限制：**
- 访问 `/canteen` 路由会自动跳转到首页
- 无法看到第二食堂、第三食堂的数据

✅ **测试操作：**
1. 进入订单管理，应该只显示第一食堂的订单
2. 尝试手动访问 `http://localhost:3001/canteen`，应该跳转到首页
3. 创建菜品/分类，应该自动关联到第一食堂

---

### 场景 3：食堂管理员权限（第二食堂）

**登录：** `admin2 / admin123`

✅ **应该能看到：**
- 只能看到第二食堂的数据
- 其他行为与场景2相同

✅ **测试操作：**
1. 进入订单管理，应该只显示第二食堂的订单
2. 创建的分类/菜品应该自动关联到第二食堂

---

### 场景 4：数据隔离验证（高级测试）

使用 Postman 或 curl 测试后端 API：

#### 4.1 食堂管理员尝试访问其他食堂的订单

```bash
# 1. 以 admin1 身份登录，获取 token
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"admin123"}'

# 2. 使用 token 访问第二食堂的订单（应该失败或只返回第一食堂数据）
curl http://localhost:4000/api/admin/orders?canteenId=<第二食堂ID> \
  -H "Authorization: Bearer <token>"
```

**预期结果：** 后端自动过滤，只返回第一食堂的订单

#### 4.2 食堂管理员尝试访问食堂管理接口

```bash
# 使用 admin1 的 token 访问食堂列表
curl http://localhost:4000/api/admin/canteens \
  -H "Authorization: Bearer <token>"
```

**预期结果：** 返回 403 错误，提示"需要超级管理员权限"

---

## 测试检查清单

### 后端权限验证

- [ ] 食堂管理员只能查询自己食堂的订单
- [ ] 食堂管理员无法访问食堂管理 API（返回 403）
- [ ] 食堂管理员创建菜品时，canteenId 被强制设置
- [ ] 食堂管理员无法修改其他食堂的菜品/分类
- [ ] 超级管理员可以访问所有资源

### 前端权限验证

- [ ] 食堂管理员看不到"食堂管理"菜单
- [ ] 食堂管理员访问 /canteen 路由被拦截
- [ ] 食堂管理员看不到食堂选择器
- [ ] 超级管理员可以看到完整菜单和功能
- [ ] 超级管理员可以切换食堂查看数据

### 用户管理验证

- [ ] 所有管理员都只能查看用户，不能编辑
- [ ] PUT /admin/users/:id 路由已被禁用

---

## 已知问题和待完成项

### 待完成的前端页面

以下页面还需要按照订单页面的模式添加权限控制：

1. **菜品管理页面** (`apps/admin/src/views/dish/index.vue`)
   - 添加 `v-if="adminStore.isSuperAdmin"` 到食堂选择器
   - API 调用时条件传递 `canteenId`

2. **分类管理页面** (`apps/admin/src/views/category/index.vue`)
   - 同上

3. **用户管理页面** (`apps/admin/src/views/user/index.vue`)
   - 移除编辑按钮和编辑对话框

4. **Dashboard 页面** (`apps/admin/src/views/dashboard/index.vue`)
   - 统计数据根据角色过滤（可选）

### 改造模板

复制订单页面的逻辑即可：

```typescript
// 1. 引入 Store
import { useAdminStore } from '@/stores/admin'
const adminStore = useAdminStore()

// 2. 条件加载食堂列表
async function loadCanteens() {
  if (!adminStore.isSuperAdmin) return
  // ... 加载逻辑
}

// 3. 条件渲染选择器
<el-select v-if="adminStore.isSuperAdmin" v-model="canteenId" ...>

// 4. API 调用时条件传参
const params: any = { ... }
if (adminStore.isSuperAdmin) {
  params.canteenId = canteenId.value
}
```

---

## 故障排查

### 问题：登录后看不到权限变化

**原因：** adminInfo 未正确加载

**解决：** 检查 Store 是否正确保存了 admin 信息，刷新页面重新登录

### 问题：后端返回 403

**原因：** Token 中没有 canteenId 或 role

**解决：** 
1. 确认数据库迁移已执行（admins 表有 canteen_id 字段）
2. 确认使用新的 seed 脚本重新创建了管理员
3. 重新登录获取新 token

### 问题：前端无法读取 canteenId

**原因：** 前端类型定义未同步

**解决：** 确认 `packages/shared/src/types/admin.ts` 已添加 `canteenId` 字段

---

## 预期效果总结

**超级管理员（superadmin）：**
- ✅ 完整功能访问
- ✅ 可管理所有食堂
- ✅ 可切换食堂查看数据
- ✅ 独占食堂管理功能

**食堂管理员（admin1/admin2）：**
- ✅ 仅管理自己的食堂
- ✅ 数据自动隔离
- ❌ 无法访问食堂管理
- ❌ 看不到其他食堂数据

**安全保障：**
- ✅ 后端强制验证权限（前端绕过无效）
- ✅ 双层防护（路由守卫 + API 权限）
- ✅ 数据隔离（查询自动过滤）
