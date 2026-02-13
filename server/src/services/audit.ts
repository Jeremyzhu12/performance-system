import { prisma } from '../lib/prisma.js'
import { Request } from 'express'

interface CreateAuditLogParams {
    operatorNo: string
    actionType: string
    targetType: string
    targetId: string
    details?: any
    ipAddress?: string
}

/**
 * 创建审计日志
 */
export async function createAuditLog(params: CreateAuditLogParams) {
    return await prisma.auditLog.create({
        data: params
    })
}

/**
 * 从请求中提取IP地址
 */
export function getClientIp(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'
    )
}

/**
 * 记录敏感操作的审计日志
 */
export async function auditSensitiveAction(
    req: Request,
    actionType: string,
    targetType: string,
    targetId: string | number,
    details?: any
) {
    if (!req.user) return

    await createAuditLog({
        operatorNo: req.user.empNo,
        actionType,
        targetType,
        targetId: String(targetId),
        details,
        ipAddress: getClientIp(req)
    })
}
