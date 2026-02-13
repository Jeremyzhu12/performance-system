import React, { useState, useEffect, useMemo } from 'react'
import {
    Card,
    Typography,
    Table,
    Row,
    Col,
    Statistic,
    Tag,
    DatePicker,
    message,
    Empty
} from 'antd'
import {
    TrophyOutlined,
    RiseOutlined,
    FallOutlined,
    CalendarOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatEmpNo } from '../utils'

const { Title, Text } = Typography
const { MonthPicker } = DatePicker

interface RecordItem {
    id: number
    empNo: string
    itemCode: string
    year: number
    month: number
    score: number
    remarks?: string
    item?: {
        name: string
        category: string
        paperCode?: string
    }
}

const MyPerformance: React.FC = () => {
    const { user } = useAuth()
    const [records, setRecords] = useState<RecordItem[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs())

    // 加载我的绩效记录
    const loadMyRecords = async () => {
        if (!user) return
        setLoading(true)
        try {
            const params: any = {
                empNo: user.empNo,
                year: selectedMonth.year(),
                month: selectedMonth.month() + 1
            }
            const response: any = await api.get('/records', { params })
            setRecords(response.data || [])
        } catch (error) {
            message.error('加载绩效数据失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMyRecords()
    }, [selectedMonth])

    // 计算统计
    const stats = useMemo(() => {
        const addScore = records.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0)
        const deductScore = records.filter(r => r.score < 0).reduce((s, r) => s + Math.abs(r.score), 0)
        const totalScore = 100 + addScore - deductScore
        const recordCount = records.length
        return { addScore, deductScore, totalScore, recordCount }
    }, [records])

    const columns: ColumnsType<RecordItem> = [
        {
            title: '序号',
            key: 'index',
            width: 60,
            render: (_, __, index) => index + 1
        },
        {
            title: '考核项目',
            key: 'itemName',
            width: 200,
            render: (_, record) => record.item?.name || record.itemCode || '-'
        },
        {
            title: '项目分类',
            key: 'category',
            width: 120,
            render: (_, record) => record.item?.category || '-'
        },
        {
            title: '分数',
            dataIndex: 'score',
            key: 'score',
            width: 100,
            align: 'center',
            render: (score: number) => (
                <Tag color={score > 0 ? 'green' : score < 0 ? 'red' : 'default'}>
                    {score > 0 ? `+${score}` : score}
                </Tag>
            )
        },
        {
            title: '备注/说明',
            dataIndex: 'remarks',
            key: 'remarks',
            ellipsis: true
        },
        {
            title: '纸质编号',
            key: 'paperCode',
            width: 120,
            render: (_, record) => record.item?.paperCode || '-'
        }
    ]

    return (
        <div>
            <Title level={2}>我的绩效</Title>

            {/* 用户信息和月份选择 */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                    <Col span={12}>
                        <Text strong>工号：</Text>{formatEmpNo(user?.empNo || '')}
                        <Text strong style={{ marginLeft: 24 }}>姓名：</Text>{user?.name}
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <CalendarOutlined style={{ marginRight: 8 }} />
                        <MonthPicker
                            value={selectedMonth}
                            onChange={(date) => date && setSelectedMonth(date)}
                            format="YYYY年MM月"
                            style={{ width: 180 }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="月度总分"
                            value={stats.totalScore}
                            precision={1}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: stats.totalScore >= 100 ? '#3f8600' : stats.totalScore >= 80 ? '#faad14' : '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="加分合计"
                            value={stats.addScore}
                            precision={1}
                            prefix={<RiseOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="扣分合计"
                            value={stats.deductScore}
                            precision={1}
                            prefix={<FallOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="考核次数"
                            value={stats.recordCount}
                            suffix="次"
                        />
                    </Card>
                </Col>
            </Row>

            {/* 记录列表 */}
            <Card title={`${selectedMonth.format('YYYY年MM月')} 考核记录`}>
                <Table
                    columns={columns}
                    dataSource={records}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: <Empty description="本月暂无考核记录" /> }}
                    pagination={false}
                />
            </Card>
        </div>
    )
}

export default MyPerformance
