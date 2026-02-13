import React, { useState, useEffect } from 'react'
import {
    Card,
    Typography,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Tag,
    message,
    Tabs,
    Row,
    Col,
    Statistic,
    Empty
} from 'antd'
import {
    PlusOutlined,
    CheckOutlined,
    CloseOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { canProcessAppeals } from '../utils/permissions'

const { Title, Text } = Typography
const { TextArea } = Input

interface Appeal {
    id: number
    recordId: number
    empNo: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    processedBy?: string
    processRemark?: string
    createdAt: string
    updatedAt: string
    record?: {
        itemCode: string
        score: number
        remarks?: string
        year: number
        month: number
    }
    employee?: {
        name: string
        empNo: string
    }
}

const AppealManagement: React.FC = () => {
    const { user } = useAuth()
    const [appeals, setAppeals] = useState<Appeal[]>([])
    const [loading, setLoading] = useState(false)
    const [submitModalVisible, setSubmitModalVisible] = useState(false)
    const [processModalVisible, setProcessModalVisible] = useState(false)
    const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
    const [activeTab, setActiveTab] = useState('my')
    const [form] = Form.useForm()
    const [processForm] = Form.useForm()
    const [myRecords, setMyRecords] = useState<any[]>([])

    const isAdmin = user ? canProcessAppeals(user.role) : false

    // 加载申诉列表
    const loadAppeals = async () => {
        setLoading(true)
        try {
            const response: any = await api.get('/appeals')
            setAppeals(response.data || [])
        } catch (error) {
            message.error('加载申诉数据失败')
        } finally {
            setLoading(false)
        }
    }

    // 加载我的绩效记录（用于提交申诉时选择）
    const loadMyRecords = async () => {
        if (!user) return
        try {
            const response: any = await api.get('/records', { params: { empNo: user.empNo } })
            setMyRecords(response.data || [])
        } catch (error) {
            // 静默处理
        }
    }

    useEffect(() => {
        loadAppeals()
        loadMyRecords()
    }, [])

    // 提交申诉
    const handleSubmitAppeal = async (values: any) => {
        try {
            await api.post('/appeals', {
                recordId: values.recordId,
                reason: values.reason
            })
            message.success('申诉提交成功')
            setSubmitModalVisible(false)
            form.resetFields()
            loadAppeals()
        } catch (error: any) {
            message.error(error.response?.data?.error || '提交申诉失败')
        }
    }

    // 处理申诉
    const handleProcessAppeal = async (values: any) => {
        if (!selectedAppeal) return
        try {
            await api.put(`/appeals/${selectedAppeal.id}/process`, {
                status: values.status,
                processRemark: values.processRemark
            })
            message.success('申诉处理成功')
            setProcessModalVisible(false)
            processForm.resetFields()
            setSelectedAppeal(null)
            loadAppeals()
        } catch (error: any) {
            message.error(error.response?.data?.error || '处理申诉失败')
        }
    }

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Tag color="orange" icon={<ExclamationCircleOutlined />}>待处理</Tag>
            case 'APPROVED':
                return <Tag color="green" icon={<CheckOutlined />}>已通过</Tag>
            case 'REJECTED':
                return <Tag color="red" icon={<CloseOutlined />}>已驳回</Tag>
            default:
                return <Tag>{status}</Tag>
        }
    }

    // 我的申诉
    const myAppeals = appeals.filter(a => a.empNo === user?.empNo)
    // 待处理申诉
    const pendingAppeals = appeals.filter(a => a.status === 'PENDING')

    const myColumns: ColumnsType<Appeal> = [
        {
            title: '申诉时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '考核月份',
            key: 'month',
            width: 100,
            render: (_, record) => record.record ? `${record.record.year}-${String(record.record.month).padStart(2, '0')}` : '-'
        },
        {
            title: '考核分数',
            key: 'score',
            width: 100,
            render: (_, record) => record.record ? (
                <Tag color={record.record.score > 0 ? 'green' : 'red'}>
                    {record.record.score > 0 ? `+${record.record.score}` : record.record.score}
                </Tag>
            ) : '-'
        },
        {
            title: '申诉理由',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => getStatusTag(status)
        },
        {
            title: '处理备注',
            dataIndex: 'processRemark',
            key: 'processRemark',
            ellipsis: true,
            render: (text: string) => text || '-'
        }
    ]

    const adminColumns: ColumnsType<Appeal> = [
        {
            title: '申诉人',
            key: 'empName',
            width: 100,
            render: (_, record) => record.employee?.name || record.empNo
        },
        {
            title: '工号',
            dataIndex: 'empNo',
            key: 'empNo',
            width: 100
        },
        {
            title: '申诉时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '考核月份',
            key: 'month',
            width: 100,
            render: (_, record) => record.record ? `${record.record.year}-${String(record.record.month).padStart(2, '0')}` : '-'
        },
        {
            title: '考核分数',
            key: 'score',
            width: 80,
            render: (_, record) => record.record ? (
                <Tag color={record.record.score > 0 ? 'green' : 'red'}>
                    {record.record.score > 0 ? `+${record.record.score}` : record.record.score}
                </Tag>
            ) : '-'
        },
        {
            title: '申诉理由',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            width: 200
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => getStatusTag(status)
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => record.status === 'PENDING' ? (
                <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                        setSelectedAppeal(record)
                        processForm.resetFields()
                        setProcessModalVisible(true)
                    }}
                >
                    处理
                </Button>
            ) : (
                <Text type="secondary">{record.processRemark || '已处理'}</Text>
            )
        }
    ]

    const tabItems = [
        {
            key: 'my',
            label: `我的申诉 (${myAppeals.length})`,
            children: (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                form.resetFields()
                                setSubmitModalVisible(true)
                            }}
                        >
                            提交申诉
                        </Button>
                    </div>
                    <Table
                        columns={myColumns}
                        dataSource={myAppeals}
                        rowKey="id"
                        loading={loading}
                        locale={{ emptyText: <Empty description="暂无申诉记录" /> }}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            )
        },
        ...(isAdmin ? [{
            key: 'pending',
            label: `待处理 (${pendingAppeals.length})`,
            children: (
                <Table
                    columns={adminColumns}
                    dataSource={pendingAppeals}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: <Empty description="暂无待处理申诉" /> }}
                    pagination={{ pageSize: 10 }}
                />
            )
        }, {
            key: 'all',
            label: `全部申诉 (${appeals.length})`,
            children: (
                <Table
                    columns={adminColumns}
                    dataSource={appeals}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            )
        }] : [])
    ]

    return (
        <div>
            <Title level={2}>申诉管理</Title>

            {/* 统计 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card><Statistic title="我的申诉" value={myAppeals.length} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="待处理" value={pendingAppeals.length} valueStyle={{ color: '#faad14' }} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="已通过" value={appeals.filter(a => a.status === 'APPROVED').length} valueStyle={{ color: '#52c41a' }} /></Card>
                </Col>
                <Col span={6}>
                    <Card><Statistic title="已驳回" value={appeals.filter(a => a.status === 'REJECTED').length} valueStyle={{ color: '#ff4d4f' }} /></Card>
                </Col>
            </Row>

            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            </Card>

            {/* 提交申诉弹窗 */}
            <Modal
                title="提交申诉"
                open={submitModalVisible}
                onCancel={() => setSubmitModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitAppeal}>
                    <Form.Item
                        name="recordId"
                        label="选择考核记录"
                        rules={[{ required: true, message: '请选择要申诉的记录' }]}
                    >
                        <Select
                            placeholder="请选择要申诉的考核记录"
                            options={myRecords.map(r => ({
                                label: `${r.year}-${String(r.month).padStart(2, '0')} | ${r.itemCode || '未匹配'} | ${r.score > 0 ? '+' : ''}${r.score}分 | ${r.remarks || '无备注'}`,
                                value: r.id
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="reason"
                        label="申诉理由"
                        rules={[{ required: true, message: '请输入申诉理由' }]}
                    >
                        <TextArea rows={4} placeholder="请详细描述申诉理由" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 处理申诉弹窗 */}
            <Modal
                title="处理申诉"
                open={processModalVisible}
                onCancel={() => {
                    setProcessModalVisible(false)
                    setSelectedAppeal(null)
                }}
                onOk={() => processForm.submit()}
                width={600}
            >
                {selectedAppeal && (
                    <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                        <p><Text strong>申诉人：</Text>{selectedAppeal.employee?.name || selectedAppeal.empNo}</p>
                        <p><Text strong>申诉理由：</Text>{selectedAppeal.reason}</p>
                        {selectedAppeal.record && (
                            <p><Text strong>相关记录：</Text>
                                {selectedAppeal.record.year}-{String(selectedAppeal.record.month).padStart(2, '0')} |
                                分数：{selectedAppeal.record.score} |
                                {selectedAppeal.record.remarks}
                            </p>
                        )}
                    </div>
                )}
                <Form form={processForm} layout="vertical" onFinish={handleProcessAppeal}>
                    <Form.Item
                        name="status"
                        label="处理结果"
                        rules={[{ required: true, message: '请选择处理结果' }]}
                    >
                        <Select placeholder="请选择处理结果">
                            <Select.Option value="APPROVED">
                                <Tag color="green">通过</Tag> 同意申诉
                            </Select.Option>
                            <Select.Option value="REJECTED">
                                <Tag color="red">驳回</Tag> 驳回申诉
                            </Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="processRemark"
                        label="处理备注"
                    >
                        <TextArea rows={3} placeholder="请输入处理备注（可选）" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default AppealManagement
