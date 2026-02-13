import React from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'

interface PrivateRouteProps {
    children: React.ReactElement
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <Spin size="large" tip="加载中..." />
            </div>
        )
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default PrivateRoute
