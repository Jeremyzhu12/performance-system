import React, { useState, useEffect } from 'react'
import {
    Card,
    Typography,
    List,
    Button,
    Space,
    Badge,
    Tag,
    message,
    Empty,
    Spin,
    Tabs,
    Tooltip
} from 'antd'
import {
    BellOutlined,
    CheckOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    ClockCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import api from '../services/api'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text, Paragraph } = Typography

interface Notification {
    id: number
    type: string
    title: string
    content: string
    isRead: boolean
    createdAt: string
}

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('all')
    const [unreadCount, setUnreadCount] = useState(0)

    const loadNotifications = async () => {
        setLoading(true)
        try {
            const params: any = {}
            if (activeTab === 'unread') params.unread = true

            const response: any = await api.get('/notifications', { params })
            setNotifications(response.data?.notifications || response.data || [])
        } catch (error) {
            message.error('加载通知失败')
        } finally {
            setLoading(false)
        }
    }

    const loadUnreadCount = async () => {
        try {
            const response: any = await api.get('/notifications/unread-count')
            setUnreadCount(response.data?.count || 0)
        } catch (error) {
            // 静默处理
        }
    }

    useEffect(() => {
        loadNotifications()
        loadUnreadCount()
    }, [activeTab])

    // 标记单条为已读
    const markAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`)
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            message.error('操作失败')
        }
    }

    // 全部标记已读
    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all')
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
            message.success('已全部标记为已读')
        } catch (error) {
            message.error('操作失败')
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'RECORD_CREATED':
            case 'RECORD_UPDATED':
                return <InfoCircleOutlined style={{ color: '#1890ff' }} />
            case 'APPEAL_SUBMITTED':
            case 'APPEAL_PROCESSED':
                return <WarningOutlined style={{ color: '#faad14' }} />
            case 'ROLE_CHANGED':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />
            default:
                return <BellOutlined style={{ color: '#666' }} />
        }
    }

    const getTypeTag = (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
            'RECORD_CREATED': { color: 'blue', label: '新记录' },
            'RECORD_UPDATED': { color: 'cyan', label: '记录更新' },
            'RECORD_DELETED': { color: 'red', label: '记录删除' },
            'APPEAL_SUBMITTED': { color: 'orange', label: '新申诉' },
            'APPEAL_PROCESSED': { color: 'green', label: '申诉处理' },
            'ROLE_CHANGED': { color: 'purple', label: '角色变更' }
        }
        const info = typeMap[type] || { color: 'default', label: type }
        return <Tag color={info.color}>{info.label}</Tag>
    }

    const tabItems = [
        { key: 'all', label: '全部通知' },
        { key: 'unread', label: <Badge count={unreadCount} offset={[10, 0]}>未读通知</Badge> }
    ]

    return (
        <div>
            <Title level={2}>消息通知</Title>

            <Card
                extra={
                    <Space>
                        <Button
                            icon={<CheckOutlined />}
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            全部已读
                        </Button>
                    </Space>
                }
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                />

                <Spin spinning={loading}>
                    <List
                        dataSource={notifications}
                        locale={{ emptyText: <Empty description="暂无通知" /> }}
                        renderItem={(item) => (
                            <List.Item
                                style={{
                                    backgroundColor: item.isRead ? 'transparent' : '#f0f5ff',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    marginBottom: 8
                                }}
                                actions={[
                                    !item.isRead && (
                                        <Tooltip title="标记已读" key="read">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CheckOutlined />}
                                                onClick={() => markAsRead(item.id)}
                                            />
                                        </Tooltip>
                                    )
                                ].filter(Boolean)}
                            >
                                <List.Item.Meta
                                    avatar={getTypeIcon(item.type)}
                                    title={
                                        <Space>
                                            {!item.isRead && <Badge status="processing" />}
                                            <Text strong={!item.isRead}>{item.title}</Text>
                                            {getTypeTag(item.type)}
                                        </Space>
                                    }
                                    description={
                                        <div>
                                            <Paragraph
                                                ellipsis={{ rows: 2, expandable: true }}
                                                style={{ marginBottom: 4 }}
                                            >
                                                {item.content}
                                            </Paragraph>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                {dayjs(item.createdAt).fromNow()}
                                                <span style={{ marginLeft: 8 }}>
                                                    {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                                                </span>
                                            </Text>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </Spin>
            </Card>
        </div>
    )
}

export default NotificationCenter
