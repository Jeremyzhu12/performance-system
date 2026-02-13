import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireMinRole } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { buildEmployeeFilter } from '../utils/permissions.js'
import { createNotification } from '../services/notification.js'

const router = Router()

/**
 * GET /api/appeals
 * 获取申诉列表（员工看自己的，管理员看下属的）
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    const { year, month, status } = req.query

    let where: any = {}

    // 普通员工只能看自己的申诉
    if (req.user!.role === 'EMPLOYEE') {
        where.empNo = req.user!.empNo
    } else {
        // 管理员看权限范围内的申诉
        const employeeFilter = buildEmployeeFilter(req.user!.role, req.user!.scope)
        if (Object.keys(employeeFilter).length > 0) {
            where.employee = employeeFilter
        }
    }

    if (year && typeof year === 'string') where.year = parseInt(year)
    if (month && typeof month === 'string') where.month = parseInt(month)
    if (status && typeof status === 'string') where.status = status

    const appeals = await prisma.appeal.findMany({
        where,
        include: {
            employee: {
                select: { empNo: true, name: true, area: true }
            },
            record: {
                include: {
                    item: {
                        select: { name: true }
                    }
                }
            },
            processor: {
                select: {
                    empNo: true,
                    employee: {
                        select: { name: true }
                    }
                }
            }
        },
        orderBy: { submittedAt: 'desc' }
    })

    res.json({
        success: true,
        data: appeals
    })
})

/**
 * GET /api/appeals/:id
 * 获取申诉详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)

    const appeal = await prisma.appeal.findUnique({
        where: { id },
        include: {
            employee: true,
            record: {
                include: {
                    item: true
                }
            },
            processor: {
                include: {
                    employee: true
                }
            },
            history: {
                orderBy: { timestamp: 'asc' }
            }
        }
    })

    if (!appeal) {
        throw new AppError('申诉不存在', 404)
    }

    // 权限检查：员工只能看自己的，管理员可以看下属的
    if (req.user!.role === 'EMPLOYEE' && appeal.empNo !== req.user!.empNo) {
        throw new AppError('无权查看该申诉', 403)
    }

    res.json({
        success: true,
        data: appeal
    })
})

/**
 * POST /api/appeals
 * 提交申诉（普通员工）
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    const { recordId, reason } = req.body

    if (!recordId || !reason) {
        throw new AppError('记录ID和申诉理由不能为空', 400)
    }

    // 查找绩效记录
    const record = await prisma.record.findUnique({
        where: { id: recordId },
        include: {
            employee: true,
            item: true
        }
    })

    if (!record) {
        throw new AppError('绩效记录不存在', 404)
    }

    // 只能申诉自己的绩效
    if (record.empNo !== req.user!.empNo) {
        throw new AppError('只能申诉自己的绩效记录', 403)
    }

    // 检查是否已经有待处理的申诉
    const existingAppeal = await prisma.appeal.findFirst({
        where: {
            recordId,
            empNo: req.user!.empNo,
            status: { in: ['PENDING', 'PROCESSING'] }
        }
    })

    if (existingAppeal) {
        throw new AppError('该记录已有待处理的申诉', 400)
    }

    // 创建申诉
    const appeal = await prisma.appeal.create({
        data: {
            empNo: req.user!.empNo,
            recordId,
            year: record.year,
            month: record.month,
            reason,
            status: 'PENDING'
        }
    })

    // 记录申诉历史
    await prisma.appealHistory.create({
        data: {
            appealId: appeal.id,
            action: '提交申诉',
            operator: req.user!.empNo,
            details: reason
        }
    })

    // 通知区域管理员
    const areaAdmins = await prisma.user.findMany({
        where: {
            role: 'AREA_ADMIN',
            scopeArea: record.employee.area
        }
    })

    for (const admin of areaAdmins) {
        await createNotification({
            recipientNo: admin.empNo,
            senderNo: req.user!.empNo,
            type: 'APPEAL_SUBMITTED',
            title: '新的绩效申诉',
            content: `${record.employee.name}对${record.year}年${record.month}月的"${record.item.name}"提出申诉`,
            relatedId: appeal.id
        })
    }

    res.json({
        success: true,
        data: appeal
    })
})

/**
 * POST /api/appeals/:id/process
 * 处理申诉（区域管理员+）
 */
router.post('/:id/process', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const { action, response } = req.body

    if (!action || !response) {
        throw new AppError('处理结果和回复内容不能为空', 400)
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
        throw new AppError('无效的处理结果', 400)
    }

    const appeal = await prisma.appeal.findUnique({
        where: { id },
        include: {
            employee: true,
            record: {
                include: {
                    item: true
                }
            }
        }
    })

    if (!appeal) {
        throw new AppError('申诉不存在', 404)
    }

    if (appeal.status !== 'PENDING' && appeal.status !== 'PROCESSING') {
        throw new AppError('该申诉已处理完成', 400)
    }

    // 更新申诉状态
    const updated = await prisma.appeal.update({
        where: { id },
        data: {
            status: action,
            processedAt: new Date(),
            processorNo: req.user!.empNo,
            response
        }
    })

    // 记录处理历史
    await prisma.appealHistory.create({
        data: {
            appealId: id,
            action: action === 'APPROVED' ? '批准申诉' : '驳回申诉',
            operator: req.user!.empNo,
            details: response
        }
    })

    // 通知申诉人
    await createNotification({
        recipientNo: appeal.empNo,
        senderNo: req.user!.empNo,
        type: 'APPEAL_PROCESSED',
        title: `申诉已${action === 'APPROVED' ? '批准' : '驳回'}`,
        content: `您对${appeal.record.year}年${appeal.record.month}月"${appeal.record.item.name}"的申诉已被${action === 'APPROVED' ? '批准' : '驳回'}`,
        relatedId: id
    })

    res.json({
        success: true,
        data: updated
    })
})

/**
 * GET /api/appeals/:id/history
 * 获取申诉历史记录
 */
router.get('/:id/history', authenticate, async (req: Request, res: Response) => {
    const appealId = parseInt(req.params.id)

    const appeal = await prisma.appeal.findUnique({
        where: { id: appealId }
    })

    if (!appeal) {
        throw new AppError('申诉不存在', 404)
    }

    // 权限检查
    if (req.user!.role === 'EMPLOYEE' && appeal.empNo !== req.user!.empNo) {
        throw new AppError('无权查看该申诉历史', 403)
    }

    const history = await prisma.appealHistory.findMany({
        where: { appealId },
        orderBy: { timestamp: 'asc' }
    })

    res.json({
        success: true,
        data: history
    })
})

/**
 * GET /api/appeals/settings/:year/:month
 * 获取申诉配置
 */
router.get('/settings/:year/:month', authenticate, async (req: Request, res: Response) => {
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)

    const settings = await prisma.appealSettings.findUnique({
        where: {
            year_month: { year, month }
        }
    })

    res.json({
        success: true,
        data: settings || {
            year,
            month,
            isOpen: false,
            deadline: null
        }
    })
})

/**
 * PUT /api/appeals/settings/:year/:month
 * 设置申诉配置（区域管理员+）
 */
router.put('/settings/:year/:month', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)
    const { deadline, isOpen } = req.body

    if (!deadline) {
        throw new AppError('截止时间不能为空', 400)
    }

    const settings = await prisma.appealSettings.upsert({
        where: {
            year_month: { year, month }
        },
        update: {
            deadline: new Date(deadline),
            isOpen: isOpen !== undefined ? isOpen : true
        },
        create: {
            year,
            month,
            deadline: new Date(deadline),
            isOpen: isOpen !== undefined ? isOpen : true,
            createdBy: req.user!.empNo
        }
    })

    res.json({
        success: true,
        data: settings
    })
})

export default router
