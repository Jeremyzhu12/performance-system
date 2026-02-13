import React, { useState, useEffect } from 'react'
import {
    Card,
    Typography,
    Table,
    Select,
    DatePicker,
    Input,
    Tag,
    message,
    Row,
    Col,
    Space,
    Empty
} from 'antd'
import {
    AuditOutlined,
    SearchOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { canViewAuditLogs } from '../utils/permissions'
import { formatEmpNo } from '../utils'

const { Title } = Typography
const { RangePicker } = DatePicker

interface AuditLog {
    id: number
    userId: string
    userName?: string
    action: string
    target: string
    details?: string
    ipAddress?: string
    createdAt: string
}

const AuditLogs: React.FC = () => {
    const { user } = useAuth()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(false)
    const [actionTypes, setActionTypes] = useState<string[]>([])
    const [selectedAction, setSelectedAction] = useState<string | undefined>()
    const [searchKeyword, setSearchKeyword] = useState('')
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

    if (!user || !canViewAuditLogs(user.role)) {
        return (
            <div>
                <Title level={2}>审计日志</Title>
                <Card><p>您没有权限访问此页面，仅超级管理员可查看。</p></Card>
            </div>
        )
    }

    // 加载日志
    const loadLogs = async (page = 1, pageSize = 20) => {
        setLoading(true)
        try {
            const params: any = {
                page,
                pageSize
            }
            if (selectedAction) params.action = selectedAction
            if (searchKeyword) params.keyword = searchKeyword
            if (dateRange) {
                params.startDate = dateRange[0].format('YYYY-MM-DD')
                params.endDate = dateRange[1].format('YYYY-MM-DD')
            }

            const response: any = await api.get('/audit-logs', { params })
            const data = response.data
            setLogs(data.logs || data || [])
            setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
                total: data.total || (data.logs || data || []).length
            }))
        } catch (error) {
            message.error('加载审计日志失败')
        } finally {
            setLoading(false)
        }
    }

    // 加载操作类型列表
    const loadActionTypes = async () => {
        try {
            const response: any = await api.get('/audit-logs/actions')
            setActionTypes(response.data || [])
        } catch (error) {
            // 静默处理
        }
    }

    useEffect(() => {
        loadLogs()
        loadActionTypes()
    }, [])

    useEffect(() => {
        loadLogs(1, pagination.pageSize)
    }, [selectedAction, dateRange])

    const getActionTag = (action: string) => {
        const actionMap: Record<string, { color: string; label: string }> = {
            'LOGIN': { color: 'blue', label: '登录' },
            'LOGOUT': { color: 'default', label: '登出' },
            'CREATE_EMPLOYEE': { color: 'green', label: '创建员工' },
            'UPDATE_EMPLOYEE': { color: 'cyan', label: '更新员工' },
            'DELETE_EMPLOYEE': { color: 'red', label: '删除员工' },
            'CREATE_RECORD': { color: 'green', label: '创建记录' },
            'UPDATE_RECORD': { color: 'cyan', label: '更新记录' },
            'DELETE_RECORD': { color: 'red', label: '删除记录' },
            'APPOINT_ADMIN': { color: 'purple', label: '任命管理员' },
            'REVOKE_ADMIN': { color: 'orange', label: '撤销管理员' },
            'PASSWORD_CHANGE': { color: 'gold', label: '修改密码' },
            'PASSWORD_RESET': { color: 'magenta', label: '重置密码' }
        }
        const info = actionMap[action] || { color: 'default', label: action }
        return <Tag color={info.color}>{info.label}</Tag>
    }

    const columns: ColumnsType<AuditLog> = [
        {
            title: '时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
        },
        {
            title: '操作人',
            key: 'user',
            width: 150,
            render: (_, record) => (
                <span>{record.userName || formatEmpNo(record.userId)}</span>
            )
        },
        {
            title: '操作类型',
            dataIndex: 'action',
            key: 'action',
            width: 130,
            render: (action: string) => getActionTag(action)
        },
        {
            title: '操作目标',
            dataIndex: 'target',
            key: 'target',
            width: 180,
            ellipsis: true
        },
        {
            title: '详情',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            render: (text: string) => text || '-'
        },
        {
            title: 'IP地址',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 140,
            render: (text: string) => text || '-'
        }
    ]

    return (
        <div>
            <Title level={2}>
                <AuditOutlined style={{ marginRight: 8 }} />
                审计日志
            </Title>

            {/* 筛选区 */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Select
                            placeholder="操作类型"
                            allowClear
                            style={{ width: '100%' }}
                            value={selectedAction}
                            onChange={setSelectedAction}
                            options={actionTypes.map(a => ({ label: a, value: a }))}
                        />
                    </Col>
                    <Col span={8}>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                        />
                    </Col>
                    <Col span={6}>
                        <Input
                            placeholder="搜索关键词"
                            prefix={<SearchOutlined />}
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onPressEnter={() => loadLogs(1, pagination.pageSize)}
                            allowClear
                        />
                    </Col>
                    <Col span={4}>
                        <Space>
                            <button
                                className="ant-btn ant-btn-primary"
                                onClick={() => loadLogs(1, pagination.pageSize)}
                            >
                                搜索
                            </button>
                            <button
                                className="ant-btn"
                                onClick={() => {
                                    setSelectedAction(undefined)
                                    setSearchKeyword('')
                                    setDateRange(null)
                                    loadLogs(1, pagination.pageSize)
                                }}
                            >
                                重置
                            </button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 日志列表 */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: <Empty description="暂无审计日志" /> }}
                    scroll={{ x: 1000 }}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条日志`,
                        onChange: (page, pageSize) => loadLogs(page, pageSize)
                    }}
                />
            </Card>
        </div>
    )
}

export default AuditLogs
