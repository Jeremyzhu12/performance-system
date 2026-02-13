import { Role } from '../contexts/AuthContext'

// 角色层级映射
const ROLE_LEVELS: Record<Role, number> = {
    EMPLOYEE: 1,
    AREA_ADMIN: 2,
    WORKSHOP_ADMIN: 3,
    CENTER_ADMIN: 4,
    SUPER_ADMIN: 5
}

/**
 * 检查用户角色是否至少达到要求的等级
 */
export const isAtLeast = (userRole: Role, requiredRole: Role): boolean => {
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
}

/**
 * 检查用户是否可以管理员工
 */
export const canManageEmployees = (role: Role): boolean => {
    return isAtLeast(role, 'AREA_ADMIN')
}

/**
 * 检查用户是否可以管理考核条目
 */
export const canManageItems = (role: Role): boolean => {
    return isAtLeast(role, 'CENTER_ADMIN')
}

/**
 * 检查用户是否可以录入绩效
 */
export const canManageRecords = (role: Role): boolean => {
    return isAtLeast(role, 'AREA_ADMIN')
}

/**
 * 检查用户是否可以管理角色（任命管理员）
 */
export const canManageRoles = (role: Role): boolean => {
    return isAtLeast(role, 'WORKSHOP_ADMIN')
}

/**
 * 检查用户是否可以查看审计日志
 */
export const canViewAuditLogs = (role: Role): boolean => {
    return role === 'SUPER_ADMIN'
}

/**
 * 检查用户是否可以处理申诉
 */
export const canProcessAppeals = (role: Role): boolean => {
    return isAtLeast(role, 'AREA_ADMIN')
}

/**
 * 获取角色的中文名称
 */
export const getRoleName = (role: Role): string => {
    const roleNames: Record<Role, string> = {
        EMPLOYEE: '普通员工',
        AREA_ADMIN: '区域管理员',
        WORKSHOP_ADMIN: '车间管理员',
        CENTER_ADMIN: '中心管理员',
        SUPER_ADMIN: '超级管理员'
    }
    return roleNames[role]
}

/**
 * 获取角色颜色（用于Tag显示）
 */
export const getRoleColor = (role: Role): string => {
    const colorMap: Record<Role, string> = {
        EMPLOYEE: 'default',
        AREA_ADMIN: 'blue',
        WORKSHOP_ADMIN: 'cyan',
        CENTER_ADMIN: 'purple',
        SUPER_ADMIN: 'red'
    }
    return colorMap[role]
}
