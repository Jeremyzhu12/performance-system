# 后端快速测试指南

## 前置准备

### 1. 环境要求
- Node.js 20+
- MySQL 8.0+
- 推荐工具：Postman 或 Thunder Client（VS Code插件）

### 2. 数据库准备

**创建数据库**：
```sql
CREATE DATABASE performance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 快速启动步骤

### 步骤1：安装依赖
```bash
cd server
npm install
```

### 步骤2：配置环境变量
复制 `.env.example` 为 `.env`，修改数据库连接：
```env
DATABASE_URL="mysql://root:your_password@localhost:3306/performance_system"
JWT_SECRET="your-random-secret-key"
JWT_REFRESH_SECRET="your-random-refresh-secret"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### 步骤3：初始化数据库
```bash
# 生成Prisma Client
npm run prisma:generate

# 运行数据库迁移（创建所有表）
npm run prisma:migrate

# 初始化超级管理员账号
npm run prisma:seed
```

**超级管理员账号**：
- 用户名：`602667`
- 密码：`Nbdt2025!`

### 步骤4：启动开发服务器
```bash
npm run dev
```

服务器将运行在 `http://localhost:3001`

访问 `http://localhost:3001/health` 检查服务器状态

---

## API测试流程

### 测试1：用户登录

**请求**：
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "602667",
  "password": "Nbdt2025!",
  "rememberMe": true
}
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "empNo": "602667",
      "username": "602667",
      "name": "超级管理员",
      "role": "SUPER_ADMIN",
      "scope": {
        "area": "",
        "workshop": "",
        "center": ""
      }
    }
  }
}
```

**保存accessToken**，后续请求需要在Header中携带：
```
Authorization: Bearer <accessToken>
```

---

### 测试2：创建员工

**请求**：
```http
POST http://localhost:3001/api/employees
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "empNo": "001",
  "name": "张三",
  "position": "工程师",
  "station": "A岗位",
  "area": "生产一区",
  "workshop": "第一车间",
  "center": "生产中心",
  "company": "某某公司"
}
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "id": 2,
    "empNo": "001",
    "name": "张三",
    ...
  }
}
```

---

### 测试3：创建考核条目

**请求**：
```http
POST http://localhost:3001/api/items
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "center": "生产中心",
  "itemCode": "ITEM001",
  "name": "产品质量",
  "category": "质量类",
  "score": 10,
  "description": "产品质量考核",
  "status": "启用"
}
```

---

### 测试4：录入绩效记录

**请求**：
```http
POST http://localhost:3001/api/records
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "empNo": "001",
  "itemCode": "ITEM001",
  "year": 2026,
  "month": 2,
  "score": 8,
  "remarks": "表现良好"
}
```

**效果**：员工001会收到一条绩效录入通知

---

### 测试5：查看消息通知

**请求**：
```http
GET http://localhost:3001/api/notifications/unread-count
Authorization: Bearer <your_access_token>
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "count": 1,
    "latestNotifications": [
      {
        "id": 1,
        "type": "RECORD_CHANGED",
        "title": "新增绩效记录",
        "createdAt": "2026-02-13T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 测试6：提交绩效申诉（需要先创建普通员工账号）

**6.1 为员工001创建账号（以超级管理员身份）**：
```http
POST http://localhost:3001/api/roles/appoint
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "empNo": "001",
  "role": "EMPLOYEE"
}
```

**6.2 员工001登录**：
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "001",
  "password": "000000",
  "rememberMe": false
}
```

**6.3 提交申诉**：
```http
POST http://localhost:3001/api/appeals
Authorization: Bearer <employee_001_token>
Content-Type: application/json

{
  "recordId": 1,
  "reason": "我认为这个月表现更好，应该得9分"
}
```

---

### 测试7：任命区域管理员

**请求**：
```http
POST http://localhost:3001/api/roles/appoint
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "empNo": "002",
  "role": "AREA_ADMIN",
  "scopeArea": "生产一区"
}
```

---

### 测试8：查看审计日志

**请求**：
```http
GET http://localhost:3001/api/audit-logs?page=1&limit=20
Authorization: Bearer <super_admin_token>
```

---

## Postman测试集合

### 导入方式
1. 打开Postman
2. Import → Raw Text
3. 粘贴以下JSON配置

```json
{
  "info": {
    "name": "绩效系统API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "认证",
      "item": [
        {
          "name": "登录",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"602667\",\n  \"password\": \"Nbdt2025!\",\n  \"rememberMe\": true\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

**使用步骤**：
1. 设置环境变量 `baseUrl` = `http://localhost:3001`
2. 登录后，将返回的 `accessToken` 设置到环境变量 `token`
3. 在需要认证的请求Header中添加：`Authorization: Bearer {{token}}`

---

## 常见问题

### Q1: 数据库连接失败
**检查**：
- MySQL服务是否启动
- `.env` 中的数据库密码是否正确
- 数据库 `performance_system` 是否已创建

### Q2: Prisma迁移失败
**解决**：
```bash
# 删除prisma/migrations文件夹
rm -rf prisma/migrations

# 重置数据库
npx prisma migrate reset

# 重新迁移
npx prisma migrate dev --name init
```

### Q3: Token过期
**现象**：返回401错误
**解决**：重新登录获取新token，或使用refresh token刷新

### Q4: 权限不足
**现象**：返回403错误
**检查**：当前用户的角色是否有权限执行该操作

---

## 数据库管理工具

### Prisma Studio（推荐）
```bash
npm run prisma:studio
```
打开浏览器访问 `http://localhost:5555`，可以可视化查看和编辑数据库

### MySQL Workbench
连接到数据库后可以查看表结构和数据

---

## 下一步

✅ 后端API已就绪，接下来可以：
1. 开始前端开发（React + TypeScript）
2. 编写单元测试
3. 准备部署到服务器

**完整API文档**：查看 `server/API.md`
