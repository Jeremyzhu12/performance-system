import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/users/me
 * 获取当前用户信息
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { empNo: req.user!.empNo },
        include: { employee: true }
    })

    if (!user) {
        return res.status(404).json({
            success: false,
            error: '用户不存在'
        })
    }

    res.json({
        success: true,
        data: {
            empNo: user.empNo,
            username: user.username,
            name: user.employee.name,
            role: user.role,
            position: user.employee.position,
            station: user.employee.station,
            area: user.employee.area,
            workshop: user.employee.workshop,
            center: user.employee.center,
            company: user.employee.company,
            scope: {
                area: user.scopeArea || user.employee.area,
                workshop: user.scopeWorkshop || user.employee.workshop,
                center: user.scopeCenter || user.employee.center
            },
            lastLogin: user.lastLogin
        }
    })
})

export default router
