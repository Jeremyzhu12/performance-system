# 绩效评估系统 - 后端服务

基于 Node.js + Express + TypeScript + Prisma + MySQL 的绩效管理系统后端API。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并修改配置：
```bash
cp .env.example .env
```

修改 `.env` 中的数据库连接信息：
```env
DATABASE_URL="mysql://root:your_password@localhost:3306/performance_system"
JWT_SECRET="your-custom-secret-key"
JWT_REFRESH_SECRET="your-custom-refresh-secret"
```

### 3. 初始化数据库
```bash
# 生成Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 初始化超级管理员账号
npm run prisma:seed
```

超级管理员账号：
- 用户名：`602667`
- 密码：`Nbdt2025!`

### 5. 测试API
查看完整测试指南：[TESTING.md](./TESTING.md)

快速测试：
```bash
# 检查服务器状态
curl http://localhost:3001/health

# 登录测试
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"602667","password":"Nbdt2025!","rememberMe":true}'
```
```bash
npm run dev
```

服务器将运行在 `http://localhost:3001`

## 项目结构

```
server/
├── prisma/
│   ├── schema.prisma       # 数据库模型定义
│   └── seed.ts            # 数据库初始化脚本
├── src/
│   ├── index.ts           # 服务器入口
│   ├── lib/
│   │   └── prisma.ts      # Prisma客户端
│   ├── middleware/
│   │   ├── auth.ts        # 认证中间件
│   │   └── errorHandler.ts # 错误处理
│   └── utils/
│       ├── jwt.ts         # JWT工具
│       ├── logger.ts      # 日志工具
│       └── permissions.ts # 权限检查
├── package.json
└── tsconfig.json
```

## 数据库表结构

- **employees** - 员工信息
- **users** - 用户账号
- **items** - 考核条目
- **records** - 绩效记录
- **appeals** - 绩效申诉
- **appeal_history** - 申诉历史
- **appeal_settings** - 申诉配置
- **notifications** - 系统消息
- **audit_logs** - 操作审计日志

## 开发脚本

- `npm run dev` - 启动开发服务器（热重载）
- `npm run build` - 构建生产版本
- `npm start` - 启动生产服务器
- `npm run prisma:generate` - 生成Prisma Client
- `npm run prisma:migrate` - 运行数据库迁移
- `npm run prisma:studio` - 打开Prisma Studio（数据库GUI）
- `npm run prisma:seed` - 初始化数据库

## 下一步开发

阶段一（基础设施搭建）已完成  ✓
阶段二（认证授权模块）- 进行中...
