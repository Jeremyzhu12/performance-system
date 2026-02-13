import { Request, Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { verifyAccessToken, JwtPayload } from '../utils/jwt.js'
import { AppError } from './errorHandler.js'

// 扩展Express Request类型
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload
        }
    }
}

// 认证中间件：验证JWT token
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('未提供认证令牌', 401)
        }

        const token = authHeader.substring(7) // 移除 "Bearer "
        const payload = verifyAccessToken(token)

        req.user = payload
        next()
    } catch (error) {
        next(new AppError('认证失败，请重新登录', 401))
    }
}

// 权限检查中间件：检查用户角色
export const requireRole = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('未认证', 401))
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError('权限不足', 403))
        }

        next()
    }
}

// 权限检查中间件：至少需要某个角色级别
export const requireMinRole = (minRole: Role) => {
    const roleHierarchy: Role[] = [
        'EMPLOYEE',
        'AREA_ADMIN',
        'WORKSHOP_ADMIN',
        'CENTER_ADMIN',
        'SUPER_ADMIN'
    ]

    const minRoleIndex = roleHierarchy.indexOf(minRole)
    const allowedRoles = roleHierarchy.slice(minRoleIndex)

    return requireRole(...allowedRoles)
}
