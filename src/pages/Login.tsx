import React, { useState } from 'react'
import { Form, Input, Button, Checkbox, Card } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
        setLoading(true)
        try {
            await login(values.username, values.password, values.remember)
            navigate('/')
        } catch (error) {
            // 错误已在AuthContext中处理
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
        >
            <Card
                style={{
                    width: 400,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    borderRadius: 8
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                        绩效考核系统
                    </h1>
                    <p style={{ color: '#666' }}>欢迎登录</p>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入工号或用户名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="工号/用户名"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Form.Item name="remember" valuePropName="checked" noStyle>
                            <Checkbox>记住我（7天免登录）</Checkbox>
                        </Form.Item>
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{ height: 45 }}
                        >
                            登录
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
                    <p>默认密码：000000（首次登录请修改密码）</p>
                    <p>超级管理员：602667 / Nbdt2025!</p>
                </div>
            </Card>
        </div>
    )
}

export default Login
