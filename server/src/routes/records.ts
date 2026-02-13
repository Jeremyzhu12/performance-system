import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireMinRole } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { buildEmployeeFilter } from '../utils/permissions.js'
import { auditSensitiveAction } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

const router = Router()

/**
 * GET /api/records
 * 获取绩效记录列表（按权限过滤）
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    const { year, month, empNo } = req.query

    // 构建员工过滤条件（基于权限）
    const employeeFilter = buildEmployeeFilter(req.user!.role, req.user!.scope)

    const where: any = {}

    if (year && typeof year === 'string') where.year = parseInt(year)
    if (month && typeof month === 'string') where.month = parseInt(month)
    if (empNo && typeof empNo === 'string') where.empNo = empNo

    // 关联员工表进行权限过滤
    if (Object.keys(employeeFilter).length > 0) {
        where.employee = employeeFilter
    }

    const records = await prisma.record.findMany({
        where,
        include: {
            employee: {
                select: { empNo: true, name: true }
            },
            item: {
                select: { itemCode: true, name: true }
            }
        },
        orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { createdAt: 'desc' }
        ]
    })

    res.json({
        success: true,
        data: records
    })
})

/**
 * GET /api/records/:id
 * 获取绩效记录详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)

    const record = await prisma.record.findUnique({
        where: { id },
        include: {
            employee: true,
            item: true
        }
    })

    if (!record) {
        throw new AppError('绩效记录不存在', 404)
    }

    res.json({
        success: true,
        data: record
    })
})

/**
 * POST /api/records
 * 新增绩效记录（区域管理员+）
 */
router.post('/', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const { empNo, itemCode, year, month, score, remarks } = req.body

    if (!empNo || !year || !month || score === undefined) {
        throw new AppError('工号、年月和分值不能为空', 400)
    }

    // 验证员工是否存在
    const employee = await prisma.employee.findUnique({ where: { empNo } })
    if (!employee) {
        throw new AppError('员工不存在', 404)
    }

    // 如果提供了itemCode，验证条目是否存在
    let item = null
    if (itemCode) {
        item = await prisma.item.findFirst({ where: { itemCode } })
        if (!item) {
            throw new AppError('考核条目不存在', 404)
        }
    }

    const record = await prisma.record.create({
        data: {
            empNo,
            itemCode,
            year,
            month,
            score,
            remarks
        }
    })

    // 发送通知给员工
    await createNotification({
        recipientNo: String(empNo),
        senderNo: req.user!.empNo,
        type: 'RECORD_CHANGED',
        title: '新增绩效记录',
        content: `${year}年${month}月的考核条目"${item?.name || itemCode || '待匹配'}"已录入，得分：${score}`,
        relatedId: record.id
    })

    await auditSensitiveAction(req, 'CREATE_RECORD', 'record', String(record.id), { record })

    res.json({
        success: true,
        data: record
    })
})

/**
 * PUT /api/records/:id
 * 更新绩效记录
 */
router.put('/:id', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const { empNo, itemCode, year, month, score, remarks } = req.body

    const existingRecord = await prisma.record.findUnique({
        where: { id },
        include: { employee: true, item: true }
    })

    if (!existingRecord) {
        throw new AppError('绩效记录不存在', 404)
    }

    // 构建更新数据，只包含传入的字段
    const updateData: any = {}
    if (score !== undefined) updateData.score = score
    if (remarks !== undefined) updateData.remarks = remarks
    if (itemCode !== undefined) updateData.itemCode = itemCode
    if (empNo !== undefined) updateData.empNo = empNo
    if (year !== undefined) updateData.year = year
    if (month !== undefined) updateData.month = month

    const updated = await prisma.record.update({
        where: { id },
        data: updateData
    })

    // 发送通知
    if (score !== existingRecord.score) {
        await createNotification({
            recipientNo: String(existingRecord.empNo),
            senderNo: req.user!.empNo,
            type: 'RECORD_CHANGED',
            title: '绩效记录已更新',
            content: `${existingRecord.year}年${existingRecord.month}月的"${existingRecord.item.name}"分数已更新：${existingRecord.score} → ${score}`,
            relatedId: id
        })
    }

    await auditSensitiveAction(req, 'UPDATE_RECORD', 'record', String(id), { before: existingRecord, after: updated })

    res.json({
        success: true,
        data: updated
    })
})

/**
 * DELETE /api/records/:id
 * 删除绩效记录
 */
router.delete('/:id', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)

    const record = await prisma.record.findUnique({ where: { id } })
    if (!record) {
        throw new AppError('绩效记录不存在', 404)
    }

    await prisma.record.delete({ where: { id } })

    await auditSensitiveAction(req, 'DELETE_RECORD', 'record', String(id), { record })

    res.json({
        success: true,
        message: '绩效记录删除成功'
    })
})

export default router
