import axios, { AxiosError } from 'axios'
import { message } from 'antd'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器：添加token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器：处理401错误和token刷新
api.interceptors.response.use(
    (response) => response.data,
    async (error: AxiosError<{ error?: string }>) => {
        const originalRequest = error.config as any

        // 401错误：token过期
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem('refreshToken')
                if (!refreshToken) {
                    throw new Error('No refresh token')
                }

                // 刷新token
                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
                    { refreshToken }
                )

                const { accessToken } = response.data.data
                localStorage.setItem('accessToken', accessToken)

                // 重试原请求
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return api(originalRequest)
            } catch (refreshError) {
                // 刷新失败，清除凭证并跳转登录
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                window.location.href = '/#/login'
                return Promise.reject(refreshError)
            }
        }

        // 其他错误
        const errorMessage = error.response?.data?.error || error.message || '请求失败'
        message.error(errorMessage)
        return Promise.reject(error)
    }
)

export default api
