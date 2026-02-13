import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireMinRole } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { buildEmployeeFilter, canManageEmployee } from '../utils/permissions.js'
import { auditSensitiveAction } from '../services/audit.js'

const router = Router()

/**
 * GET /api/employees
 * 获取员工列表（自动按权限过滤）
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    const { search, area, workshop, center } = req.query

    // 构建基础过滤条件
    const baseFilter = buildEmployeeFilter(req.user!.role, req.user!.scope)

    // 添加搜索条件
    const where: any = { ...baseFilter }

    if (search) {
        where.OR = [
            { empNo: { contains: search as string } },
            { name: { contains: search as string } }
        ]
    }

    if (area) where.area = area
    if (workshop) where.workshop = workshop
    if (center) where.center = center

    const employees = await prisma.employee.findMany({
        where,
        orderBy: { empNo: 'asc' }
    })

    res.json({
        success: true,
        data: employees
    })
})

/**
 * GET /api/employees/:empNo
 * 获取员工详情
 */
router.get('/:empNo', authenticate, async (req: Request, res: Response) => {
    const { empNo } = req.params

    const employee = await prisma.employee.findUnique({
        where: { empNo },
        include: {
            user: {
                select: {
                    role: true,
                    scopeArea: true,
                    scopeWorkshop: true,
                    scopeCenter: true
                }
            }
        }
    })

    if (!employee) {
        throw new AppError('员工不存在', 404)
    }

    // 检查权限
    if (!canManageEmployee(req.user!.role, req.user!.scope, employee)) {
        throw new AppError('无权查看该员工信息', 403)
    }

    res.json({
        success: true,
        data: employee
    })
})

/**
 * POST /api/employees
 * 新增员工
 */
router.post('/', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const { empNo, name, position, station, area, workshop, center, company } = req.body

    if (!empNo || !name) {
        throw new AppError('工号和姓名不能为空', 400)
    }

    // 检查工号是否已存在
    const existing = await prisma.employee.findUnique({
        where: { empNo }
    })

    if (existing) {
        throw new AppError('工号已存在', 400)
    }

    // 创建员工
    const employee = await prisma.employee.create({
        data: {
            empNo,
            name,
            position,
            station,
            area,
            workshop,
            center,
            company
        }
    })

    // 记录审计日志
    await auditSensitiveAction(req, 'CREATE_EMPLOYEE', 'employee', String(empNo), { employee })

    res.json({
        success: true,
        data: employee
    })
})

/**
 * PUT /api/employees/:empNo
 * 更新员工信息
 */
router.put('/:empNo', authenticate, requireMinRole('AREA_ADMIN'), async (req: Request, res: Response) => {
    const { empNo } = req.params
    const { name, position, station, area, workshop, center, company } = req.body

    const employee = await prisma.employee.findUnique({
        where: { empNo }
    })

    if (!employee) {
        throw new AppError('员工不存在', 404)
    }

    // 检查权限
    if (!canManageEmployee(req.user!.role, req.user!.scope, employee)) {
        throw new AppError('无权修改该员工信息', 403)
    }

    const updated = await prisma.employee.update({
        where: { empNo },
        data: {
            name,
            position,
            station,
            area,
            workshop,
            center,
            company
        }
    })

    // 记录审计日志
    await auditSensitiveAction(req, 'UPDATE_EMPLOYEE', 'employee', String(empNo), {
        before: employee,
        after: updated
    })

    res.json({
        success: true,
        data: updated
    })
})

/**
 * DELETE /api/employees/:empNo
 * 删除员工
 */
router.delete('/:empNo', authenticate, requireMinRole('WORKSHOP_ADMIN'), async (req: Request, res: Response) => {
    const { empNo } = req.params

    const employee = await prisma.employee.findUnique({
        where: { empNo }
    })

    if (!employee) {
        throw new AppError('员工不存在', 404)
    }

    // 检查权限
    if (!canManageEmployee(req.user!.role, req.user!.scope, employee)) {
        throw new AppError('无权删除该员工', 403)
    }

    await prisma.employee.delete({
        where: { empNo }
    })

    // 记录审计日志
    await auditSensitiveAction(req, 'DELETE_EMPLOYEE', 'employee', empNo, { employee })

    res.json({
        success: true,
        message: '员工删除成功'
    })
})

export default router
