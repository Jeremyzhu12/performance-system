import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireMinRole } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { canAppointRole } from '../utils/permissions.js'
import { auditSensitiveAction } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

// Role枚举会在prisma generate后从@prisma/client导出
type Role = 'EMPLOYEE' | 'AREA_ADMIN' | 'WORKSHOP_ADMIN' | 'CENTER_ADMIN' | 'SUPER_ADMIN'

const router = Router()

/**
 * GET /api/roles/users
 * 获取所有用户及其角色信息
 */
router.get('/users', authenticate, requireMinRole('WORKSHOP_ADMIN'), async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        include: {
            employee: {
                select: {
                    name: true,
                    position: true,
                    station: true,
                    area: true,
                    workshop: true,
                    center: true
                }
            }
        },
        orderBy: { role: 'desc' }
    })

    const data = users.map(u => ({
        empNo: u.empNo,
        username: u.username,
        role: u.role,
        scope: [u.scopeArea, u.scopeWorkshop, u.scopeCenter].filter(Boolean).join(' / ') || '',
        scopeArea: u.scopeArea,
        scopeWorkshop: u.scopeWorkshop,
        scopeCenter: u.scopeCenter,
        name: u.employee?.name || u.username,
        position: u.employee?.position,
        station: u.employee?.station,
        area: u.employee?.area,
        workshop: u.employee?.workshop,
        center: u.employee?.center,
        lastLogin: u.lastLogin
    }))

    res.json({
        success: true,
        data
    })
})

/**
 * GET /api/roles/employees
 * 获取可任命的员工列表
 */
router.get('/employees', authenticate, requireMinRole('WORKSHOP_ADMIN'), async (req: Request, res: Response) => {
    // 获取没有用户账号的员工（可以任命为管理员）
    const employees = await prisma.employee.findMany({
        where: {
            user: null
        },
        select: {
            empNo: true,
            name: true,
            position: true,
            area: true,
            workshop: true,
            center: true
        }
    })

    res.json({
        success: true,
        data: employees
    })
})

/**
 * POST /api/roles/appoint
 * 任命管理员
 */
router.post('/appoint', authenticate, requireMinRole('WORKSHOP_ADMIN'), async (req: Request, res: Response) => {
    const { empNo, role, scopeArea, scopeWorkshop, scopeCenter } = req.body

    if (!empNo || !role) {
        throw new AppError('工号和角色不能为空', 400)
    }

    // 验证角色
    const validRoles: Role[] = ['AREA_ADMIN', 'WORKSHOP_ADMIN', 'CENTER_ADMIN', 'SUPER_ADMIN']
    if (!validRoles.includes(role)) {
        throw new AppError('无效的角色', 400)
    }

    // 查找员工
    const employee = await prisma.employee.findUnique({
        where: { empNo },
        include: { user: true }
    })

    if (!employee) {
        throw new AppError('员工不存在', 404)
    }

    // 构建目标scope
    const targetScope = {
        area: scopeArea || employee.area,
        workshop: scopeWorkshop || employee.workshop,
        center: scopeCenter || employee.center
    }

    // 检查任命权限
    if (!canAppointRole(req.user!.role, req.user!.scope, role, targetScope)) {
        throw new AppError('权限不足，无法任命该级别的管理员', 403)
    }

    // 如果已有用户账号，更新角色
    if (employee.user) {
        const updated = await prisma.user.update({
            where: { id: employee.user.id },
            data: {
                role,
                scopeArea: targetScope.area,
                scopeWorkshop: targetScope.workshop,
                scopeCenter: targetScope.center
            }
        })

        await auditSensitiveAction(req, 'UPDATE_ROLE', 'user', empNo, {
            from: employee.user.role,
            to: role,
            scope: targetScope
        })

        await createNotification({
            recipientNo: empNo,
            senderNo: req.user!.empNo,
            type: 'ROLE_CHANGED',
            title: '角色已更新',
            content: `您的角色已更新为${getRoleName(role)}`
        })

        return res.json({
            success: true,
            data: updated
        })
    }

    // 创建新用户账号
    const defaultPassword = '000000'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const newUser = await prisma.user.create({
        data: {
            empNo,
            username: empNo,
            passwordHash: hashedPassword,
            role,
            scopeArea: targetScope.area,
            scopeWorkshop: targetScope.workshop,
            scopeCenter: targetScope.center
        }
    })

    await auditSensitiveAction(req, 'APPOINT_ADMIN', 'user', empNo, {
        role,
        scope: targetScope
    })

    await createNotification({
        recipientNo: empNo,
        senderNo: req.user!.empNo,
        type: 'ROLE_CHANGED',
        title: '您已被任命为管理员',
        content: `您已被任命为${getRoleName(role)}，初始密码：000000，请尽快修改`
    })

    res.json({
        success: true,
        data: newUser,
        message: `已成功任命${employee.name}为${getRoleName(role)}，初始密码：000000`
    })
})

/**
 * POST /api/roles/revoke
 * 撤销管理员权限
 */
router.post('/revoke', authenticate, requireMinRole('WORKSHOP_ADMIN'), async (req: Request, res: Response) => {
    const { empNo } = req.body

    if (!empNo) {
        throw new AppError('工号不能为空', 400)
    }

    const user = await prisma.user.findUnique({
        where: { empNo },
        include: { employee: true }
    })

    if (!user) {
        throw new AppError('用户不存在', 404)
    }

    if (user.role === 'EMPLOYEE') {
        throw new AppError('该用户不是管理员', 400)
    }

    // 检查权限（只能撤销自己权限范围内的管理员）
    const targetScope = {
        area: user.scopeArea,
        workshop: user.scopeWorkshop,
        center: user.scopeCenter
    }

    if (!canAppointRole(req.user!.role, req.user!.scope, user.role, targetScope)) {
        throw new AppError('权限不足，无法撤销该管理员', 403)
    }

    // 降为普通员工
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'EMPLOYEE',
            scopeArea: null,
            scopeWorkshop: null,
            scopeCenter: null
        }
    })

    await auditSensitiveAction(req, 'REVOKE_ADMIN', 'user', empNo, {
        fromRole: user.role,
        toRole: 'EMPLOYEE'
    })

    await createNotification({
        recipientNo: empNo,
        senderNo: req.user!.empNo,
        type: 'ROLE_CHANGED',
        title: '管理员权限已撤销',
        content: '您的管理员权限已被撤销，现在是普通员工'
    })

    res.json({
        success: true,
        data: updated,
        message: '管理员权限已撤销'
    })
})

// 辅助函数：获取角色中文名称
function getRoleName(role: Role): string {
    const roleNames: Record<Role, string> = {
        EMPLOYEE: '普通员工',
        AREA_ADMIN: '区域管理员',
        WORKSHOP_ADMIN: '车间管理员',
        CENTER_ADMIN: '中心管理员',
        SUPER_ADMIN: '超级管理员'
    }
    return roleNames[role]
}

export default router
