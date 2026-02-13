import { prisma } from '../lib/prisma.js'

// NotificationType 会在 prisma generate 后从 @prisma/client 导出
// 临时定义类型，待 generate 后会被覆盖
type NotificationType =
    | 'APPEAL_SUBMITTED'
    | 'APPEAL_PROCESSED'
    | 'TRANSFER_NOTIFY'
    | 'RECORD_CHANGED'
    | 'ROLE_CHANGED'

interface CreateNotificationParams {
    recipientNo: string
    senderNo?: string
    type: NotificationType
    title: string
    content: string
    relatedId?: number
}

/**
 * 创建系统通知
 */
export async function createNotification(params: CreateNotificationParams) {
    return await prisma.notification.create({
        data: params
    })
}

/**
 * 批量创建通知
 */
export async function createManyNotifications(notifications: CreateNotificationParams[]) {
    return await prisma.notification.createMany({
        data: notifications
    })
}

/**
 * 获取用户未读通知数量
 */
export async function getUnreadCount(recipientNo: string): Promise<number> {
    return await prisma.notification.count({
        where: {
            recipientNo,
            isRead: false
        }
    })
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId: number) {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    })
}

/**
 * 标记用户所有通知为已读
 */
export async function markAllAsRead(recipientNo: string) {
    return await prisma.notification.updateMany({
        where: {
            recipientNo,
            isRead: false
        },
        data: { isRead: true }
    })
}
