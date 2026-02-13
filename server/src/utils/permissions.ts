import { Employee, Role } from '@prisma/client'

// 权限检查工具函数

/**
 * 检查用户是否可以管理指定员工
 */
export function canManageEmployee(
    userRole: Role,
    userScope: { area?: string; workshop?: string; center?: string },
    employee: Employee
): boolean {
    switch (userRole) {
        case 'SUPER_ADMIN':
            return true

        case 'CENTER_ADMIN':
            return employee.center === userScope.center

        case 'WORKSHOP_ADMIN':
            return employee.workshop === userScope.workshop

        case 'AREA_ADMIN':
            return employee.area === userScope.area

        default:
            return false
    }
}

/**
 * 检查用户是否可以调拨员工
 */
export function canTransferEmployee(
    userRole: Role,
    userScope: { area?: string; workshop?: string; center?: string },
    fromEmployee: Employee,
    toOrg: { area?: string; workshop?: string; center?: string }
): boolean {
    // 跨中心调动：仅超级管理员
    if (fromEmployee.center !== toOrg.center) {
        return userRole === 'SUPER_ADMIN'
    }

    // 同中心跨车间：中心管理员+
    if (fromEmployee.workshop !== toOrg.workshop) {
        return userRole === 'CENTER_ADMIN' || userRole === 'SUPER_ADMIN'
    }

    // 同车间跨区域：车间管理员+
    if (fromEmployee.area !== toOrg.area) {
        const allowedRoles: Role[] = ['WORKSHOP_ADMIN', 'CENTER_ADMIN', 'SUPER_ADMIN']
        return allowedRoles.includes(userRole)
    }

    // 区域内车站调动：区域管理员+
    const allowedRoles: Role[] = ['AREA_ADMIN', 'WORKSHOP_ADMIN', 'CENTER_ADMIN', 'SUPER_ADMIN']
    return allowedRoles.includes(userRole)
}

/**
 * 构建员工查询的WHERE条件（基于权限过滤）
 */
export function buildEmployeeFilter(
    userRole: Role,
    userScope: { area?: string; workshop?: string; center?: string }
) {
    switch (userRole) {
        case 'SUPER_ADMIN':
            return {} // 无限制

        case 'CENTER_ADMIN':
            return { center: userScope.center }

        case 'WORKSHOP_ADMIN':
            return { workshop: userScope.workshop }

        case 'AREA_ADMIN':
        case 'EMPLOYEE':
            return { area: userScope.area }

        default:
            return { id: -1 } // 无权限
    }
}

/**
 * 构建考核条目查询的WHERE条件（基于权限过滤）
 */
export function buildItemFilter(
    userRole: Role,
    userScope: { area?: string; workshop?: string; center?: string }
) {
    switch (userRole) {
        case 'SUPER_ADMIN':
            return {} // 无限制

        case 'CENTER_ADMIN':
        case 'WORKSHOP_ADMIN':
        case 'AREA_ADMIN':
        case 'EMPLOYEE':
            return { center: userScope.center }

        default:
            return { id: -1 } // 无权限
    }
}

/**
 * 检查用户是否可以管理考核条目
 */
export function canManageItem(userRole: Role): boolean {
    return userRole === 'CENTER_ADMIN' || userRole === 'SUPER_ADMIN'
}

/**
 * 检查用户是否可以任命指定级别的管理员
 */
export function canAppointRole(
    userRole: Role,
    userScope: { area?: string; workshop?: string; center?: string },
    targetRole: Role,
    targetScope: { area?: string; workshop?: string; center?: string }
): boolean {
    // 超级管理员可以任命所有角色
    if (userRole === 'SUPER_ADMIN') {
        return true
    }

    // 中心管理员可以任命本中心的车间和区域管理员
    if (userRole === 'CENTER_ADMIN') {
        if (targetScope.center !== userScope.center) {
            return false
        }
        return targetRole === 'WORKSHOP_ADMIN' || targetRole === 'AREA_ADMIN'
    }

    // 车间管理员可以任命本车间的区域管理员
    if (userRole === 'WORKSHOP_ADMIN') {
        if (targetScope.workshop !== userScope.workshop) {
            return false
        }
        return targetRole === 'AREA_ADMIN'
    }

    return false
}
