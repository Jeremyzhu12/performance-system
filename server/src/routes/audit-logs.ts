import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

/**
 * GET /api/audit-logs
 * 获取审计日志（仅超级管理员）
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    if (req.user!.role !== 'SUPER_ADMIN') {
        throw new AppError('权限不足，仅超级管理员可查看审计日志', 403)
    }

    const { page = '1', limit = '50', actionType, operatorNo, startDate, endDate } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (actionType && typeof actionType === 'string') {
        where.actionType = actionType
    }

    if (operatorNo && typeof operatorNo === 'string') {
        where.operatorNo = operatorNo
    }

    if (startDate && typeof startDate === 'string') {
        where.timestamp = { ...where.timestamp, gte: new Date(startDate) }
    }

    if (endDate && typeof endDate === 'string') {
        where.timestamp = { ...where.timestamp, lte: new Date(endDate) }
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: {
                operator: {
                    include: {
                        employee: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { timestamp: 'desc' },
            skip,
            take: limitNum
        }),
        prisma.auditLog.count({ where })
    ])

    res.json({
        success: true,
        data: {
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        }
    })
})

/**
 * GET /api/audit-logs/actions
 * 获取操作类型列表
 */
router.get('/actions', authenticate, async (req: Request, res: Response) => {
    if (req.user!.role !== 'SUPER_ADMIN') {
        throw new AppError('权限不足', 403)
    }

    const actions = await prisma.auditLog.findMany({
        select: {
            actionType: true
        },
        distinct: ['actionType']
    })

    res.json({
        success: true,
        data: actions.map((a: { actionType: string }) => a.actionType)
    })
})

export default router
