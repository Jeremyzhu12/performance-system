import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'
import { message } from 'antd'

export type Role = 'EMPLOYEE' | 'AREA_ADMIN' | 'WORKSHOP_ADMIN' | 'CENTER_ADMIN' | 'SUPER_ADMIN'

export interface User {
    empNo: string
    username: string
    name: string
    role: Role
    scope: {
        area?: string
        workshop?: string
        center?: string
    }
    position?: string
    station?: string
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (username: string, password: string, rememberMe: boolean) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // 初始化：从localStorage恢复用户信息
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user')
            const token = localStorage.getItem('accessToken')

            if (storedUser && token) {
                try {
                    setUser(JSON.parse(storedUser))
                    // 验证token有效性
                    await api.get('/users/me')
                } catch (error) {
                    // Token无效，清除
                    localStorage.removeItem('user')
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    setUser(null)
                }
            }
            setIsLoading(false)
        }

        initAuth()
    }, [])

    const login = async (username: string, password: string, rememberMe: boolean) => {
        try {
            const response: any = await api.post('/auth/login', {
                username,
                password,
                rememberMe
            })

            const { accessToken, refreshToken, user: userData } = response.data

            // 保存token和用户信息
            localStorage.setItem('accessToken', accessToken)
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken)
            }
            localStorage.setItem('user', JSON.stringify(userData))

            setUser(userData)
            message.success('登录成功')
        } catch (error: any) {
            message.error(error.response?.data?.error || '登录失败')
            throw error
        }
    }

    const logout = async () => {
        try {
            await api.post('/auth/logout')
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            // 清除本地数据
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            setUser(null)
            message.success('已退出登录')
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
