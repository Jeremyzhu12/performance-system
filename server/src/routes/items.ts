import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireMinRole } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { buildItemFilter, canManageItem } from '../utils/permissions.js'
import { auditSensitiveAction } from '../services/audit.js'

const router = Router()

/**
 * GET /api/items
 * 获取考核条目列表（按权限过滤）
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    const { center, status, category } = req.query

    const baseFilter = buildItemFilter(req.user!.role, req.user!.scope)

    const where: any = { ...baseFilter }
    if (center && typeof center === 'string') where.center = center
    if (status && typeof status === 'string') where.status = status
    if (category && typeof category === 'string') where.category = category

    const items = await prisma.item.findMany({
        where,
        orderBy: { itemCode: 'asc' }
    })

    res.json({
        success: true,
        data: items
    })
})

/**
 * GET /api/items/:id
 * 获取条目详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)

    const item = await prisma.item.findUnique({
        where: { id }
    })

    if (!item) {
        throw new AppError('考核条目不存在', 404)
    }

    res.json({
        success: true,
        data: item
    })
})

/**
 * POST /api/items
 * 新增考核条目（中心管理员+）
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    if (!canManageItem(req.user!.role)) {
        throw new AppError('权限不足，只有中心管理员及以上可以管理考核条目', 403)
    }

    const { center, company, department, paperCode, itemCode, name, category, score, description, status, groupName } = req.body

    if (!center || !itemCode || !name || score === undefined) {
        throw new AppError('中心、条目代码、名称和分值不能为空', 400)
    }

    // 中心管理员只能为自己的中心创建条目
    if (req.user!.role === 'CENTER_ADMIN' && String(center) !== req.user!.scope.center) {
        throw new AppError('只能为自己管辖的中心创建考核条目', 403)
    }

    const item = await prisma.item.create({
        data: {
            center,
            company,
            department,
            paperCode,
            itemCode,
            name,
            category,
            score,
            description,
            status: status || '启用',
            groupName
        }
    })

    await auditSensitiveAction(req, 'CREATE_ITEM', 'item', String(item.id), { item })

    res.json({
        success: true,
        data: item
    })
})

/**
 * PUT /api/items/:id
 * 更新考核条目
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    if (!canManageItem(req.user!.role)) {
        throw new AppError('权限不足', 403)
    }

    const id = parseInt(req.params.id)
    const { center, company, department, paperCode, itemCode, name, category, score, description, status, groupName } = req.body

    const existingItem = await prisma.item.findUnique({ where: { id } })
    if (!existingItem) {
        throw new AppError('考核条目不存在', 404)
    }

    // 中心管理员只能修改自己中心的条目
    if (req.user!.role === 'CENTER_ADMIN' && existingItem.center !== req.user!.scope.center) {
        throw new AppError('无权修改其他中心的考核条目', 403)
    }

    const updated = await prisma.item.update({
        where: { id },
        data: {
            center,
            company,
            department,
            paperCode,
            itemCode,
            name,
            category,
            score,
            description,
            status,
            groupName
        }
    })

    await auditSensitiveAction(req, 'UPDATE_ITEM', 'item', String(id), { before: existingItem, after: updated })

    res.json({
        success: true,
        data: updated
    })
})

/**
 * DELETE /api/items/:id
 * 删除考核条目
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    if (!canManageItem(req.user!.role)) {
        throw new AppError('权限不足', 403)
    }

    const id = parseInt(req.params.id)

    const item = await prisma.item.findUnique({ where: { id } })
    if (!item) {
        throw new AppError('考核条目不存在', 404)
    }

    // 中心管理员只能删除自己中心的条目
    if (req.user!.role === 'CENTER_ADMIN' && item.center !== req.user!.scope.center) {
        throw new AppError('无权删除其他中心的考核条目', 403)
    }

    await prisma.item.delete({ where: { id } })

    await auditSensitiveAction(req, 'DELETE_ITEM', 'item', String(id), { item })

    res.json({
        success: true,
        message: '考核条目删除成功'
    })
})

export default router
