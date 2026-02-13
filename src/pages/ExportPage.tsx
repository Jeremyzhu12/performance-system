import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Typography,
  Button,
  Space,
  Form,
  DatePicker,
  Row,
  Col,
  Statistic,
  Table,
  message,
  Tag,
  Modal,
  Input,
  Checkbox
} from 'antd'
import {
  FileExcelOutlined,
  UserOutlined,
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import api from '../services/api'
import { Record, Employee, Item, WorkshopExportFormat, SystemExportFormat } from '../types'
import { formatEmpNo } from '../utils'

const { Title } = Typography
const { MonthPicker } = DatePicker

// 合并后的员工数据接口
interface MergedEmployeeData {
  employee: Employee
  records: { item: Item; record: Record }[]
  totalScore: number
  addScore: number
  deductScore: number
  month: string
}

const ExportPage: React.FC = () => {
  const [form] = Form.useForm()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [displayData, setDisplayData] = useState<MergedEmployeeData[]>([])
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MergedEmployeeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // 筛选条件状态
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs | null>(null)

  // 员工选择弹窗状态
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState<number[]>([])

  // 加载基础数据
  const loadBaseData = async () => {
    setLoading(true)
    try {
      const [empRes, itemRes, recRes]: any[] = await Promise.all([
        api.get('/employees'),
        api.get('/items'),
        api.get('/records')
      ])
      setEmployees(empRes.data || [])
      setItems(itemRes.data || [])
      // 将后端year/month拆分字段合并为month字符串
      const mappedRecords = (recRes.data || []).map((r: any) => ({
        ...r,
        month: `${r.year}-${String(r.month).padStart(2, '0')}`
      }))
      setRecords(mappedRecords)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  // 使用useMemo优化数据筛选和聚合计算
  const computedData = useMemo(() => {
    if (!employees.length || !items.length) return []

    // 创建查找映射以提高性能
    const itemMap = new Map(items.map(item => [item.itemCode, item]))

    // 确定要处理的员工列表
    let targetEmployees = employees
    if (selectedEmployees.length > 0) {
      targetEmployees = employees.filter(emp => selectedEmployees.includes(emp.id!))
    }

    // 确定目标月份
    const targetMonth = selectedMonth ? selectedMonth.format('YYYY-MM') : null

    // 筛选记录
    let filtered = records
    if (selectedEmployees.length > 0) {
      const selectedEmpNos = new Set(targetEmployees.map(emp => emp.empNo))
      filtered = filtered.filter(record => selectedEmpNos.has(record.empNo))
    }
    if (targetMonth) {
      filtered = filtered.filter(record => record.month.startsWith(targetMonth))
    }

    // 按员工和月份分组记录
    const recordGroups = new Map<string, { item: Item; record: Record }[]>()
    filtered.forEach(record => {
      const item = itemMap.get(record.itemCode)
      if (item) {
        const key = `${record.empNo}-${record.month}`
        if (!recordGroups.has(key)) {
          recordGroups.set(key, [])
        }
        recordGroups.get(key)!.push({ item, record })
      }
    })

    // 为每个员工生成数据，包括没有绩效记录的员工
    const result: MergedEmployeeData[] = []

    targetEmployees.forEach(employee => {
      // 如果指定了月份，只处理该月份；否则处理所有月份或创建默认月份
      if (targetMonth) {
        // 处理指定月份
        const key = `${employee.empNo}-${targetMonth}`
        const records = recordGroups.get(key) || []

        // 计算加分和扣分
        let addScore = 0
        let deductScore = 0

        records.forEach(({ record }) => {
          if (record.score > 0) {
            addScore += record.score
          } else if (record.score < 0) {
            deductScore += Math.abs(record.score)
          }
        })

        // 计算最终得分（起始分100 + 加分 - 扣分）
        const totalScore = 100 + addScore - deductScore

        result.push({
          employee,
          records,
          addScore,
          deductScore,
          totalScore,
          month: targetMonth
        })
      } else {
        // 没有指定月份时，处理该员工的所有月份记录
        const employeeRecordGroups = new Map<string, { item: Item; record: Record }[]>()

        // 收集该员工的所有记录按月份分组
        Array.from(recordGroups.entries())
          .filter(([key]) => key.startsWith(`${employee.empNo}-`))
          .forEach(([key, records]) => {
            const month = key.split('-').slice(1).join('-')
            employeeRecordGroups.set(month, records)
          })

        // 如果员工没有任何记录，创建当前月份的默认记录
        if (employeeRecordGroups.size === 0) {
          const currentMonth = dayjs().format('YYYY-MM')
          result.push({
            employee,
            records: [],
            addScore: 0,
            deductScore: 0,
            totalScore: 100,
            month: currentMonth
          })
        } else {
          // 为每个月份创建记录
          employeeRecordGroups.forEach((records, month) => {
            let addScore = 0
            let deductScore = 0

            records.forEach(({ record }) => {
              if (record.score > 0) {
                addScore += record.score
              } else if (record.score < 0) {
                deductScore += Math.abs(record.score)
              }
            })

            const totalScore = 100 + addScore - deductScore

            result.push({
              employee,
              records,
              addScore,
              deductScore,
              totalScore,
              month
            })
          })
        }
      }
    })

    return result
  }, [selectedEmployees, selectedMonth, employees, items, records])

  // 更新显示数据
  useEffect(() => {
    setDisplayData(computedData)
  }, [computedData])

  // 员工搜索筛选
  useEffect(() => {
    if (searchKeyword.trim() === '') {
      setFilteredEmployees(employees)
    } else {
      const keyword = searchKeyword.toLowerCase()
      const filtered = employees.filter(emp => {
        return emp.name?.toLowerCase().includes(keyword) ||
          emp.empNo?.toLowerCase().includes(keyword) ||
          emp.position?.toLowerCase().includes(keyword) ||
          emp.station?.toLowerCase().includes(keyword)
      })
      setFilteredEmployees(filtered)
    }
  }, [searchKeyword, employees])

  // 重置筛选条件
  const handleReset = () => {
    setSelectedEmployees([])
    setSelectedMonth(null)
    form.resetFields()
  }

  // 车间Excel导出
  const exportWorkshopFormat = () => {
    if (displayData.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    setExportLoading(true)
    try {
      // 计算每个员工的聚合数据
      const workshopData: WorkshopExportFormat[] = displayData.map(({ employee, records, addScore, deductScore, totalScore }) => {
        // 使用已计算的分数
        const 绩效加分 = addScore
        const 扣减得分 = 100 - deductScore
        const 月度绩效考核结果 = totalScore

        // 考核内容（按加分项和扣分项分别组织）
        const addRecords = records.filter(({ record }) => record.score > 0)
        const deductRecords = records.filter(({ record }) => record.score < 0)

        let 考核内容 = ''

        // 扣分项（如果存在）
        if (deductRecords.length > 0) {
          考核内容 += '扣分项：\n'
          deductRecords.forEach(({ item, record }, index) => {
            const itemNumber = index + 1
            const paperCode = item.paperCode || ''
            const remarks = record.remarks || ''
            const score = Math.abs(record.score)
            考核内容 += `${itemNumber}.根据《站务中心一线技能岗绩效管理办法(试行)》${paperCode}，${remarks}，考核${score}分\n`
          })
        }

        // 加分项（如果存在）
        if (addRecords.length > 0) {
          if (deductRecords.length > 0) 考核内容 += ''
          考核内容 += '加分项：\n'
          addRecords.forEach(({ item, record }, index) => {
            const itemNumber = index + 1
            const paperCode = item.paperCode || ''
            const remarks = record.remarks || ''
            const score = record.score
            考核内容 += `${itemNumber}.根据《站务中心一线技能岗绩效管理办法(试行)》${paperCode}，${remarks}，加${score}分\n`
          })
        }

        return {
          工号: formatEmpNo(employee.empNo),
          中心: employee.center || '',
          姓名: employee.name,
          岗位: employee.position || '',
          绩效加分,
          扣减得分,
          月度绩效考核结果,
          考核内容: 考核内容.trim(),
          车站: employee.station || ''
        }
      })

      const ws = XLSX.utils.json_to_sheet(workshopData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '车间绩效数据')

      const fileName = `车间绩效数据_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)
      message.success(`导出成功：${fileName}`)
    } catch (error) {
      message.error('导出失败')
    } finally {
      setExportLoading(false)
    }
  }

  // 系统Excel导出
  const exportSystemFormat = () => {
    if (displayData.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    setExportLoading(true)
    try {
      const systemData: SystemExportFormat[] = displayData.flatMap(({ employee, records }) =>
        records.map(({ item, record }) => ({
          工号: formatEmpNo(employee.empNo),
          姓名: employee.name,
          项目编号: record.itemCode,
          项目名称: item.name,
          项目分值: item.score,
          项目说明: item.description,
          得分: record.score,
          备注说明: record.remarks
        }))
      )

      const ws = XLSX.utils.json_to_sheet(systemData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '系统绩效数据')

      const fileName = `系统绩效数据_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)
      message.success(`导出成功：${fileName}`)
    } catch (error) {
      message.error('导出失败')
    } finally {
      setExportLoading(false)
    }
  }

  // 计算统计数据
  const getStatistics = () => {
    const uniqueEmployees = displayData.length
    const totalAddScore = displayData.reduce((sum, data) => sum + data.addScore, 0)
    const totalDeductScore = displayData.reduce((sum, data) => sum + data.deductScore, 0)
    const avgScore = uniqueEmployees > 0
      ? displayData.reduce((sum, data) => sum + data.totalScore, 0) / uniqueEmployees
      : 0
    const maxScore = uniqueEmployees > 0 ? Math.max(...displayData.map(data => data.totalScore)) : 0
    const minScore = uniqueEmployees > 0 ? Math.min(...displayData.map(data => data.totalScore)) : 0

    return { uniqueEmployees, totalAddScore, totalDeductScore, avgScore, maxScore, minScore }
  }

  const statistics = getStatistics()

  // 表格列定义
  const columns: ColumnsType<MergedEmployeeData> = [
    {
      title: '工号',
      dataIndex: ['employee', 'empNo'],
      key: 'empNo',
      render: (empNo: string) => formatEmpNo(empNo),
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: ['employee', 'name'],
      key: 'name',
      width: 100,
    },
    {
      title: '岗位',
      dataIndex: ['employee', 'position'],
      key: 'position',
      width: 120,
    },
    {
      title: '车站',
      dataIndex: ['employee', 'station'],
      key: 'station',
      width: 100,
    },
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
    {
      title: '加分',
      dataIndex: 'addScore',
      key: 'addScore',
      render: (score: number) => (
        <Tag color="green">+{score}</Tag>
      ),
      width: 80,
    },
    {
      title: '扣分',
      dataIndex: 'deductScore',
      key: 'deductScore',
      render: (score: number) => (
        <Tag color="red">-{score}</Tag>
      ),
      width: 80,
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      render: (score: number) => (
        <Tag color={score >= 100 ? 'green' : score >= 80 ? 'orange' : 'red'}>
          {score.toFixed(1)}
        </Tag>
      ),
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setSelectedRecord(record)
            setDetailsVisible(true)
          }}
        >
          查看详情
        </Button>
      ),
      width: 100,
    },
  ]

  return (
    <div>
      <Title level={2}>数据导出</Title>

      {/* 筛选条件 */}
      <Card title="筛选条件" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="选择员工" name="employees">
                <div>
                  <Button
                    icon={<UserOutlined />}
                    onClick={() => {
                      setTempSelectedEmployees([...selectedEmployees])
                      setEmployeeModalVisible(true)
                    }}
                  >
                    选择员工 ({selectedEmployees.length})
                  </Button>
                  {selectedEmployees.length > 0 && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setSelectedEmployees([])}
                      style={{ marginLeft: 8 }}
                    >
                      清空
                    </Button>
                  )}
                </div>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="选择月份" name="month">
                <MonthPicker
                  placeholder="选择月份"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  format="YYYY-MM"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleReset}>重置条件</Button>
                <Button type="primary" disabled>
                  自动筛选
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 统计信息 */}
      <Card title="统计信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="员工数量" value={statistics.uniqueEmployees} />
          </Col>
          <Col span={4}>
            <Statistic title="总加分" value={statistics.totalAddScore} precision={1} />
          </Col>
          <Col span={4}>
            <Statistic title="总扣分" value={statistics.totalDeductScore} precision={1} />
          </Col>
          <Col span={4}>
            <Statistic title="平均分" value={statistics.avgScore} precision={1} />
          </Col>
          <Col span={4}>
            <Statistic title="最高分" value={statistics.maxScore} precision={1} />
          </Col>
          <Col span={4}>
            <Statistic title="最低分" value={statistics.minScore} precision={1} />
          </Col>
        </Row>
      </Card>

      {/* 导出按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            size="large"
            loading={exportLoading}
            onClick={exportWorkshopFormat}
            disabled={displayData.length === 0}
          >
            导出车间格式Excel
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            size="large"
            loading={exportLoading}
            onClick={exportSystemFormat}
            disabled={displayData.length === 0}
          >
            导出系统格式Excel
          </Button>
        </Space>
      </Card>

      {/* 数据预览 */}
      <Card title={`数据预览 (共 ${displayData.length} 条记录)`} style={{ marginBottom: 16 }}>
        <Table
          columns={columns}
          dataSource={displayData}
          rowKey={(record) => `${record.employee.id}-${record.month}`}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 员工选择弹窗 */}
      <Modal
        title="选择员工"
        open={employeeModalVisible}
        onOk={() => {
          setSelectedEmployees([...tempSelectedEmployees])
          setEmployeeModalVisible(false)
        }}
        onCancel={() => {
          setTempSelectedEmployees([...selectedEmployees])
          setEmployeeModalVisible(false)
        }}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索员工姓名、工号、岗位或车站"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
          />
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Checkbox.Group
            value={tempSelectedEmployees}
            onChange={setTempSelectedEmployees}
            style={{ width: '100%' }}
          >
            <Row>
              {filteredEmployees.map(emp => (
                <Col span={12} key={emp.id} style={{ marginBottom: 8 }}>
                  <Checkbox value={emp.id}>
                    {formatEmpNo(emp.empNo)} - {emp.name} ({emp.position})
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="绩效详情"
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>员工信息：</strong>
              {formatEmpNo(selectedRecord.employee.empNo)} - {selectedRecord.employee.name} ({selectedRecord.employee.position})
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>考核月份：</strong> {selectedRecord.month}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>绩效汇总：</strong>
              <Tag color="green" style={{ marginLeft: 8 }}>加分 +{selectedRecord.addScore}</Tag>
              <Tag color="red">扣分 -{selectedRecord.deductScore}</Tag>
              <Tag color="blue">总分 {selectedRecord.totalScore.toFixed(1)}</Tag>
            </div>
            <div>
              <strong>详细记录：</strong>

              {/* 扣分项 */}
              {selectedRecord.records.filter(({ record }) => record.score < 0).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#f5222d',
                    marginBottom: 8,
                    fontSize: '14px'
                  }}>
                    扣分项：
                  </div>
                  {selectedRecord.records
                    .filter(({ record }) => record.score < 0)
                    .map(({ item, record }, index) => (
                      <div key={`deduct-${index}`} style={{
                        padding: 12,
                        border: '1px solid #ffccc7',
                        borderRadius: 4,
                        marginBottom: 8,
                        backgroundColor: '#fff2f0'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#f5222d' }}>
                          {index + 1}. {item.name} ({record.score}分)
                        </div>
                        <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                          {record.remarks || '无备注'}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* 加分项 */}
              {selectedRecord.records.filter(({ record }) => record.score > 0).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#52c41a',
                    marginBottom: 8,
                    fontSize: '14px'
                  }}>
                    加分项：
                  </div>
                  {selectedRecord.records
                    .filter(({ record }) => record.score > 0)
                    .map(({ item, record }, index) => (
                      <div key={`add-${index}`} style={{
                        padding: 12,
                        border: '1px solid #b7eb8f',
                        borderRadius: 4,
                        marginBottom: 8,
                        backgroundColor: '#f6ffed'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#52c41a' }}>
                          {index + 1}. {item.name} (+{record.score}分)
                        </div>
                        <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                          {record.remarks || '无备注'}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* 如果没有任何记录 */}
              {selectedRecord.records.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#999',
                  padding: 20,
                  fontStyle: 'italic'
                }}>
                  暂无考核记录
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ExportPage
