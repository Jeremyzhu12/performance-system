import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { AppError } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
    const { username, password, rememberMe } = req.body

    // 验证必填字段
    if (!username || !password) {
        throw new AppError('用户名和密码不能为空', 400)
    }

    // 查找用户
    const user = await prisma.user.findUnique({
        where: { username },
        include: { employee: true }
    })

    if (!user) {
        throw new AppError('用户名或密码错误', 401)
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
        throw new AppError('用户名或密码错误', 401)
    }

    // 生成tokens
    const accessToken = generateAccessToken({
        empNo: user.empNo,
        role: user.role,
        scope: {
            area: user.scopeArea || user.employee.area || undefined,
            workshop: user.scopeWorkshop || user.employee.workshop || undefined,
            center: user.scopeCenter || user.employee.center || undefined
        }
    })

    let refreshToken: string | null = null
    if (rememberMe) {
        refreshToken = generateRefreshToken(user.empNo)

        // 保存refresh token到数据库
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken }
        })
    }

    // 更新最后登录时间
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
    })

    res.json({
        success: true,
        data: {
            accessToken,
            refreshToken,
            user: {
                empNo: user.empNo,
                username: user.username,
                name: user.employee.name,
                role: user.role,
                scope: {
                    area: user.scopeArea || user.employee.area,
                    workshop: user.scopeWorkshop || user.employee.workshop,
                    center: user.scopeCenter || user.employee.center
                }
            }
        }
    })
})

/**
 * POST /api/auth/refresh
 * 刷新access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
        throw new AppError('未提供refresh token', 400)
    }

    // 验证refresh token
    const payload = verifyRefreshToken(refreshToken)

    // 从数据库验证token是否有效
    const user = await prisma.user.findUnique({
        where: { empNo: payload.empNo },
        include: { employee: true }
    })

    if (!user || user.refreshToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401)
    }

    // 生成新的access token
    const newAccessToken = generateAccessToken({
        empNo: user.empNo,
        role: user.role,
        scope: {
            area: user.scopeArea || user.employee.area || undefined,
            workshop: user.scopeWorkshop || user.employee.workshop || undefined,
            center: user.scopeCenter || user.employee.center || undefined
        }
    })

    res.json({
        success: true,
        data: {
            accessToken: newAccessToken
        }
    })
})

/**
 * POST /api/auth/logout
 * 退出登录
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
    // 清除refresh token
    await prisma.user.update({
        where: { empNo: req.user!.empNo },
        data: { refreshToken: null }
    })

    res.json({
        success: true,
        message: '退出登录成功'
    })
})

/**
 * POST /api/auth/change-password
 * 修改密码（用户自己）
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
        throw new AppError('旧密码和新密码不能为空', 400)
    }

    if (newPassword.length < 6) {
        throw new AppError('新密码长度不能少于6位', 400)
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
        where: { empNo: req.user!.empNo }
    })

    if (!user) {
        throw new AppError('用户不存在', 404)
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!isOldPasswordValid) {
        throw new AppError('旧密码不正确', 401)
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hashedNewPassword,
            refreshToken: null // 清除所有refresh token，要求重新登录
        }
    })

    res.json({
        success: true,
        message: '密码修改成功，请重新登录'
    })
})

/**
 * POST /api/auth/reset-password
 * 重置密码（管理员操作）
 */
router.post('/reset-password', authenticate, async (req: Request, res: Response) => {
    const { empNo, newPassword } = req.body

    // 只有管理员才能重置密码
    const allowedRoles = ['AREA_ADMIN', 'WORKSHOP_ADMIN', 'CENTER_ADMIN', 'SUPER_ADMIN']
    if (!allowedRoles.includes(req.user!.role)) {
        throw new AppError('权限不足', 403)
    }

    if (!empNo || !newPassword) {
        throw new AppError('工号和新密码不能为空', 400)
    }

    if (newPassword.length < 6) {
        throw new AppError('新密码长度不能少于6位', 400)
    }

    // 查找目标用户
    const targetUser = await prisma.user.findUnique({
        where: { empNo }
    })

    if (!targetUser) {
        throw new AppError('用户不存在', 404)
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
        where: { id: targetUser.id },
        data: {
            passwordHash: hashedPassword,
            refreshToken: null
        }
    })

    res.json({
        success: true,
        message: '密码重置成功'
    })
})

export default router
