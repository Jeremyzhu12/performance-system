import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { getUnreadCount, markAsRead, markAllAsRead } from '../services/notification.js'

const router = Router()

/**
 * GET /api/notifications
 * 获取消息列表
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    const { page = '1', limit = '20', isRead } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {
        recipientNo: req.user!.empNo
    }

    if (isRead !== undefined) {
        where.isRead = isRead === 'true'
    }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
            include: {
                sender: {
                    select: {
                        empNo: true,
                        employee: {
                            select: { name: true }
                        }
                    }
                }
            }
        }),
        prisma.notification.count({ where })
    ])

    res.json({
        success: true,
        data: {
            notifications,
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
 * GET /api/notifications/unread-count
 * 获取未读消息数量（用于轮询）
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
    const count = await getUnreadCount(req.user!.empNo)

    // 获取最新5条未读消息
    const latestNotifications = await prisma.notification.findMany({
        where: {
            recipientNo: req.user!.empNo,
            isRead: false
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            type: true,
            title: true,
            createdAt: true
        }
    })

    res.json({
        success: true,
        data: {
            count,
            latestNotifications
        }
    })
})

/**
 * POST /api/notifications/:id/read
 * 标记消息为已读
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)

    const notification = await prisma.notification.findUnique({
        where: { id }
    })

    if (!notification) {
        return res.status(404).json({
            success: false,
            error: '消息不存在'
        })
    }

    if (notification.recipientNo !== req.user!.empNo) {
        return res.status(403).json({
            success: false,
            error: '无权操作该消息'
        })
    }

    await markAsRead(id)

    res.json({
        success: true,
        message: '已标记为已读'
    })
})

/**
 * POST /api/notifications/mark-all-read
 * 全部标记为已读
 */
router.post('/mark-all-read', authenticate, async (req: Request, res: Response) => {
    await markAllAsRead(req.user!.empNo)

    res.json({
        success: true,
        message: '所有消息已标记为已读'
    })
})

export default router
