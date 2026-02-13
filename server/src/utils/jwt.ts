import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'

export interface JwtPayload {
    empNo: string
    role: Role
    scope: {
        area?: string
        workshop?: string
        center?: string
    }
}

export interface AccessTokenPayload extends JwtPayload {
    type: 'access'
}

export interface RefreshTokenPayload {
    empNo: string
    type: 'refresh'
}

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'

// 生成Access Token（15分钟有效）
export function generateAccessToken(payload: JwtPayload): string {
    const tokenPayload: AccessTokenPayload = {
        ...payload,
        type: 'access'
    }

    return jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, {
        expiresIn: '15m'
    })
}

// 生成Refresh Token（永久有效，存储在数据库）
export function generateRefreshToken(empNo: string): string {
    const tokenPayload: RefreshTokenPayload = {
        empNo,
        type: 'refresh'
    }

    return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET)
}

// 验证Access Token
export function verifyAccessToken(token: string): AccessTokenPayload {
    try {
        const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload

        if (payload.type !== 'access') {
            throw new Error('Invalid token type')
        }

        return payload
    } catch (error) {
        throw new Error('Invalid or expired token')
    }
}

// 验证Refresh Token
export function verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
        const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload

        if (payload.type !== 'refresh') {
            throw new Error('Invalid token type')
        }

        return payload
    } catch (error) {
        throw new Error('Invalid refresh token')
    }
}
