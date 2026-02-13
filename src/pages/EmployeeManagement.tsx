import React, { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Upload,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmployeeImportTemplate } from '../types'
import { formatEmpNo } from '../utils'
import { useAuth } from '../contexts/AuthContext'
import { canManageEmployees } from '../utils/permissions'

const { Title } = Typography
const { Search } = Input

interface EmployeeResponse {
  empNo: string
  name: string
  position?: string
  station?: string
  area?: string
  workshop?: string
  center?: string
  company?: string
}

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<EmployeeResponse[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeResponse | null>(null)
  const [form] = Form.useForm()
  const [searchValue, setSearchValue] = useState('')
  const [filterStation, setFilterStation] = useState<string | undefined>(undefined)
  const [filterPosition, setFilterPosition] = useState<string | undefined>(undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 权限检查
  if (!user || !canManageEmployees(user.role)) {
    return (
      <div>
        <Title level={2}>员工管理</Title>
        <Card>
          <p>您没有权限访问此页面</p>
        </Card>
      </div>
    )
  }

  // 加载员工数据
  const loadEmployees = async () => {
    setLoading(true)
    try {
      const response: any = await api.get('/employees')
      const data = response.data || []
      setEmployees(data)
      applyFilters(data, searchValue, filterStation, filterPosition)
    } catch (error) {
      message.error('加载员工数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  // 安全的字符串转换函数
  const safeToString = (value: any): string => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  // 应用所有筛选条件
  const applyFilters = (data: EmployeeResponse[], search: string, station?: string, position?: string) => {
    let filtered = [...data]

    // 搜索筛选
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((emp) =>
        safeToString(emp.name).toLowerCase().includes(searchLower) ||
        safeToString(emp.empNo).toLowerCase().includes(searchLower) ||
        safeToString(emp.position).toLowerCase().includes(searchLower) ||
        safeToString(emp.station).toLowerCase().includes(searchLower) ||
        safeToString(emp.workshop).toLowerCase().includes(searchLower) ||
        safeToString(emp.center).toLowerCase().includes(searchLower) ||
        safeToString(emp.area).toLowerCase().includes(searchLower) ||
        safeToString(emp.company).toLowerCase().includes(searchLower)
      )
    }

    // 车站筛选
    if (station) {
      filtered = filtered.filter(emp => emp.station === station)
    }

    // 岗位筛选
    if (position) {
      filtered = filtered.filter(emp => emp.position === position)
    }

    // 按工号排序
    filtered.sort((a, b) => {
      const empNoA = safeToString(a.empNo)
      const empNoB = safeToString(b.empNo)
      return empNoA.localeCompare(empNoB, undefined, { numeric: true })
    })

    setFilteredEmployees(filtered)
  }

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchValue(value)
    applyFilters(employees, value, filterStation, filterPosition)
  }

  // 筛选处理
  const handleFilterChange = (type: 'station' | 'position', value: string | undefined) => {
    let newStation = filterStation
    let newPosition = filterPosition

    switch (type) {
      case 'station':
        newStation = value
        setFilterStation(value)
        break
      case 'position':
        newPosition = value
        setFilterPosition(value)
        break
    }

    applyFilters(employees, searchValue, newStation, newPosition)
  }

  // 批量删除功能
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的员工')
      return
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 名员工吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 批量删除
          await Promise.all(
            selectedRowKeys.map(empNo => api.delete(`/employees/${empNo}`))
          )
          message.success(`成功删除 ${selectedRowKeys.length} 名员工`)
          setSelectedRowKeys([])
          loadEmployees()
        } catch (error) {
          message.error('批量删除失败')
        }
      }
    })
  }

  // 处理表格选择
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  }

  // 获取筛选选项
  const getFilterOptions = (field: keyof EmployeeResponse) => {
    const options = Array.from(new Set(employees.map(emp => emp[field]).filter(Boolean)))
    return options.map(option => ({ label: option, value: option }))
  }

  // 新增员工
  const handleAdd = () => {
    setEditingEmployee(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 编辑员工
  const handleEdit = (record: EmployeeResponse) => {
    setEditingEmployee(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  // 删除员工
  const handleDelete = async (empNo: string) => {
    try {
      await api.delete(`/employees/${empNo}`)
      message.success('删除成功')
      loadEmployees()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 保存员工
  const handleSave = async (values: any) => {
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.empNo}`, values)
        message.success('更新成功')
      } else {
        await api.post('/employees', values)
        message.success('添加成功')
      }
      setModalVisible(false)
      loadEmployees()
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '保存失败'
      message.error(errorMsg)
    }
  }

  // 下载模板
  const downloadTemplate = () => {
    const template: EmployeeImportTemplate[] = [
      {
        姓名: '张三',
        工号: 'EMP001',
        岗位: '技术员',
        车站: '北京站',
        区域: '华北区',
        车间: '机务车间',
        中心: '技术中心',
        公司: '铁路公司'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '员工模板')
    XLSX.writeFile(wb, '员工导入模板.xlsx')
  }

  // Excel导入
  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData: EmployeeImportTemplate[] = XLSX.utils.sheet_to_json(worksheet)

        const employees = jsonData.map((item) => ({
          name: item.姓名,
          empNo: formatEmpNo(item.工号),
          position: item.岗位,
          station: item.车站,
          area: item.区域,
          workshop: item.车间,
          center: item.中心,
          company: item.公司
        }))

        // 批量导入
        let successCount = 0
        let errorCount = 0

        for (const emp of employees) {
          try {
            await api.post('/employees', emp)
            successCount++
          } catch (error) {
            errorCount++
          }
        }

        message.success(`成功导入 ${successCount} 条员工数据${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`)
        loadEmployees()
      } catch (error) {
        message.error('导入失败，请检查文件格式')
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // 导出Excel
  const handleExport = () => {
    const exportData = filteredEmployees.map((emp) => ({
      姓名: emp.name,
      工号: emp.empNo,
      岗位: emp.position,
      车站: emp.station,
      区域: emp.area,
      车间: emp.workshop,
      中心: emp.center,
      公司: emp.company
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '员工数据')
    XLSX.writeFile(wb, `员工数据_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const columns: ColumnsType<EmployeeResponse> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '工号',
      dataIndex: 'empNo',
      key: 'empNo',
      width: 100,
      render: (text) => formatEmpNo(text)
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
      title: '车站',
      dataIndex: 'station',
      key: 'station',
      width: 120
    },
    {
      title: '区域',
      dataIndex: 'area',
      key: 'area',
      width: 100
    },
    {
      title: '车间',
      dataIndex: 'workshop',
      key: 'workshop',
      width: 120
    },
    {
      title: '中心',
      dataIndex: 'center',
      key: 'center',
      width: 120
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个员工吗？"
            onConfirm={() => handleDelete(record.empNo)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Title level={2}>员工管理</Title>

      <Card>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="员工总数" value={employees.length} />
          </Col>
          <Col span={6}>
            <Statistic title="筛选结果" value={filteredEmployees.length} />
          </Col>
          <Col span={6}>
            <Statistic title="已选择" value={selectedRowKeys.length} />
          </Col>
        </Row>

        {/* 搜索和筛选区域 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={10}>
            <Search
              placeholder="搜索员工（姓名、工号、岗位等）"
              allowClear
              value={searchValue}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="筛选车站"
              allowClear
              style={{ width: '100%' }}
              value={filterStation}
              onChange={(value) => handleFilterChange('station', value)}
              options={getFilterOptions('station')}
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="筛选岗位"
              allowClear
              style={{ width: '100%' }}
              value={filterPosition}
              onChange={(value) => handleFilterChange('position', value)}
              options={getFilterOptions('position')}
            />
          </Col>
        </Row>

        {/* 操作按钮区域 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Space>
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增员工
              </Button>
              <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                下载模板
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={handleImport}
              >
                <Button icon={<UploadOutlined />}>导入Excel</Button>
              </Upload>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出Excel
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredEmployees}
          rowKey="empNo"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range?.[0]}-${range?.[1]} 条，共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title={editingEmployee ? '编辑员工' : '新增员工'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="empNo"
                label="工号"
                rules={[{ required: true, message: '请输入工号' }]}
              >
                <Input placeholder="请输入工号" disabled={!!editingEmployee} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label="岗位"
                rules={[{ required: true, message: '请输入岗位' }]}
              >
                <Input placeholder="请输入岗位" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="station"
                label="车站"
                rules={[{ required: true, message: '请输入车站' }]}
              >
                <Input placeholder="请输入车站" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="area"
                label="区域"
                rules={[{ required: true, message: '请输入区域' }]}
              >
                <Input placeholder="请输入区域" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="workshop"
                label="车间"
                rules={[{ required: true, message: '请输入车间' }]}
              >
                <Input placeholder="请输入车间" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="center"
                label="中心"
                rules={[{ required: true, message: '请输入中心' }]}
              >
                <Input placeholder="请输入中心" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label="公司"
                rules={[{ required: true, message: '请输入公司' }]}
              >
                <Input placeholder="请输入公司" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default EmployeeManagement