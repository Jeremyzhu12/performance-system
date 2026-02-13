import express from 'express'
import cors from 'cors'
import 'express-async-errors'
import { config } from 'dotenv'
import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'

// 加载环境变量
config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`)
    next()
})

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import employeeRoutes from './routes/employees.js'
import itemRoutes from './routes/items.js'
import recordRoutes from './routes/records.js'
import notificationRoutes from './routes/notifications.js'
import appealRoutes from './routes/appeals.js'
import roleRoutes from './routes/roles.js'
import auditLogRoutes from './routes/audit-logs.js'

app.get('/api', (req, res) => {
    res.json({
        message: '绩效评估系统API',
        version: '1.0.0'
    })
})

// 认证路由
app.use('/api/auth', authRoutes)

// 用户路由
app.use('/api/users', userRoutes)

// 员工管理路由
app.use('/api/employees', employeeRoutes)

// 考核条目路由
app.use('/api/items', itemRoutes)

// 绩效记录路由
app.use('/api/records', recordRoutes)

// 消息通知路由
app.use('/api/notifications', notificationRoutes)

// 绩效申诉路由
app.use('/api/appeals', appealRoutes)

// 管理员任命路由
app.use('/api/roles', roleRoutes)

// 审计日志路由
app.use('/api/audit-logs', auditLogRoutes)

// 错误处理
app.use(errorHandler)

// 启动服务器
app.listen(PORT, () => {
    logger.info(`🚀 服务器运行在端口 ${PORT}`)
    logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`📝 API文档: http://localhost:${PORT}/api`)
})

export default app
