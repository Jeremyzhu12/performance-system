import React, { useState, useEffect } from 'react'
import {
    Card,
    Typography,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Select,
    Input,
    Tag,
    message,
    Row,
    Col,
    Statistic
} from 'antd'
import {
    CrownOutlined,
    UserSwitchOutlined,
    DeleteOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { canManageRoles, getRoleName, getRoleColor, isAtLeast } from '../utils/permissions'
import { formatEmpNo } from '../utils'
import type { Role } from '../contexts/AuthContext'

const { Title, Text } = Typography

interface UserInfo {
    empNo: string
    name: string
    role: Role
    scope?: string
    position?: string
    station?: string
    area?: string
    workshop?: string
    center?: string
}

const ROLE_OPTIONS = [
    { value: 'AREA_ADMIN', label: '区域管理员' },
    { value: 'WORKSHOP_ADMIN', label: '车间管理员' },
    { value: 'CENTER_ADMIN', label: '中心管理员' },
]

const RoleManagement: React.FC = () => {
    const { user } = useAuth()
    const [employees, setEmployees] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [appointModalVisible, setAppointModalVisible] = useState(false)
    const [form] = Form.useForm()

    if (!user || !canManageRoles(user.role)) {
        return (
            <div>
                <Title level={2}>角色管理</Title>
                <Card><p>您没有权限访问此页面</p></Card>
            </div>
        )
    }

    // 加载员工列表（含角色信息）
    const loadEmployees = async () => {
        setLoading(true)
        try {
            const response: any = await api.get('/employees')
            // 需要从角色接口获取用户角色信息
            const roleResponse: any = await api.get('/roles/users')
            const roleMap = new Map()
            if (Array.isArray(roleResponse.data)) {
                roleResponse.data.forEach((u: any) => {
                    roleMap.set(u.empNo, { role: u.role, scope: u.scope })
                })
            }

            const merged = (response.data || []).map((emp: any) => ({
                ...emp,
                role: roleMap.get(emp.empNo)?.role || 'EMPLOYEE',
                scope: roleMap.get(emp.empNo)?.scope || ''
            }))
            setEmployees(merged)
        } catch (error) {
            message.error('加载数据失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadEmployees()
    }, [])

    // 任命管理员
    const handleAppoint = async (values: any) => {
        try {
            await api.post('/roles/appoint', {
                empNo: values.targetEmpNo,
                role: values.targetRole,
                scopeArea: values.targetScope || ''
            })
            message.success('任命成功')
            setAppointModalVisible(false)
            form.resetFields()
            loadEmployees()
        } catch (error: any) {
            message.error(error.response?.data?.error || '任命失败')
        }
    }

    // 撤销管理员
    const handleRevoke = async (empNo: string) => {
        try {
            await api.post('/roles/revoke', { empNo })
            message.success('已撤销管理员权限')
            loadEmployees()
        } catch (error: any) {
            message.error(error.response?.data?.error || '撤销失败')
        }
    }

    // 管理员统计
    const adminCount = employees.filter(e => e.role !== 'EMPLOYEE').length

    // 可任命的角色选项（只能任命比自己低的角色）
    const availableRoles = ROLE_OPTIONS.filter(opt => {
        if (user.role === 'SUPER_ADMIN') return true
        return !isAtLeast(opt.value as Role, user.role)
    })

    const columns: ColumnsType<UserInfo> = [
        {
            title: '工号',
            dataIndex: 'empNo',
            key: 'empNo',
            width: 100,
            render: (text: string) => formatEmpNo(text)
        },
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            width: 100
        },
        {
            title: '岗位',
            dataIndex: 'position',
            key: 'position',
            width: 120
        },
        {
            title: '车站/区域',
            key: 'location',
            width: 150,
            render: (_, record) => `${record.station || ''} ${record.area || ''}`
        },
        {
            title: '当前角色',
            dataIndex: 'role',
            key: 'role',
            width: 130,
            render: (role: Role) => (
                <Tag color={getRoleColor(role)} icon={role !== 'EMPLOYEE' ? <CrownOutlined /> : undefined}>
                    {getRoleName(role)}
                </Tag>
            ),
            filters: [
                { text: '普通员工', value: 'EMPLOYEE' },
                { text: '区域管理员', value: 'AREA_ADMIN' },
                { text: '车间管理员', value: 'WORKSHOP_ADMIN' },
                { text: '中心管理员', value: 'CENTER_ADMIN' },
                { text: '超级管理员', value: 'SUPER_ADMIN' }
            ],
            onFilter: (value, record) => record.role === value
        },
        {
            title: '管理范围',
            dataIndex: 'scope',
            key: 'scope',
            width: 150,
            render: (scope: string) => scope || '-'
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_, record) => {
                if (record.empNo === user.empNo) return <Text type="secondary">当前用户</Text>
                if (record.role === 'SUPER_ADMIN') return <Text type="secondary">超级管理员</Text>

                return (
                    <Space>
                        {record.role !== 'EMPLOYEE' && (
                            <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    Modal.confirm({
                                        title: '确认撤销',
                                        content: `确定要撤销 ${record.name} 的管理员权限吗？`,
                                        onOk: () => handleRevoke(record.empNo)
                                    })
                                }}
                            >
                                撤销
                            </Button>
                        )}
                    </Space>
                )
            }
        }
    ]

    return (
        <div>
            <Title level={2}>角色管理</Title>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card><Statistic title="员工总数" value={employees.length} /></Card>
                </Col>
                <Col span={8}>
                    <Card><Statistic title="管理员数量" value={adminCount} valueStyle={{ color: '#1890ff' }} /></Card>
                </Col>
                <Col span={8}>
                    <Card><Statistic title="普通员工" value={employees.length - adminCount} /></Card>
                </Col>
            </Row>

            <Card
                extra={
                    <Button
                        type="primary"
                        icon={<UserSwitchOutlined />}
                        onClick={() => {
                            form.resetFields()
                            setAppointModalVisible(true)
                        }}
                    >
                        任命管理员
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={employees}
                    rowKey="empNo"
                    loading={loading}
                    scroll={{ x: 900 }}
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条`
                    }}
                />
            </Card>

            {/* 任命弹窗 */}
            <Modal
                title="任命管理员"
                open={appointModalVisible}
                onCancel={() => setAppointModalVisible(false)}
                onOk={() => form.submit()}
                width={500}
            >
                <Form form={form} layout="vertical" onFinish={handleAppoint}>
                    <Form.Item
                        name="targetEmpNo"
                        label="选择员工"
                        rules={[{ required: true, message: '请选择员工' }]}
                    >
                        <Select
                            showSearch
                            placeholder="搜索并选择员工"
                            optionFilterProp="label"
                            options={employees
                                .filter(e => e.role === 'EMPLOYEE')
                                .map(e => ({
                                    label: `${formatEmpNo(e.empNo)} - ${e.name} (${e.position || ''})`,
                                    value: e.empNo
                                }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="targetRole"
                        label="角色"
                        rules={[{ required: true, message: '请选择角色' }]}
                    >
                        <Select placeholder="请选择角色" options={availableRoles} />
                    </Form.Item>
                    <Form.Item
                        name="targetScope"
                        label="管理范围"
                        tooltip="例如：区域名称、车间名称或中心名称"
                    >
                        <Input placeholder="请输入管理范围（可选）" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default RoleManagement
