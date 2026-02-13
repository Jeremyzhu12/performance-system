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
  InputNumber,
  Select,
  Switch,
  message,
  Popconfirm,
  Upload,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { ItemImportTemplate } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { canManageItems } from '../utils/permissions'

const { Title } = Typography
const { Search, TextArea } = Input
const { Option } = Select

interface ItemResponse {
  id: number
  itemCode: string
  name: string
  category: string
  score: number
  description: string
  status: string
  center?: string
  company?: string
  department?: string
  paperCode?: string
  groupName?: string
}

const ItemManagement: React.FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<ItemResponse[]>([])
  const [filteredItems, setFilteredItems] = useState<ItemResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemResponse | null>(null)
  const [form] = Form.useForm()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 权限检查
  if (!user || !canManageItems(user.role)) {
    return (
      <div>
        <Title level={2}>绩效管理办法</Title>
        <Card><p>您没有权限访问此页面</p></Card>
      </div>
    )
  }

  // 加载条目数据
  const loadItems = async () => {
    setLoading(true)
    try {
      const response: any = await api.get('/items')
      const data = response.data || []
      const sortedData = data.sort((a: ItemResponse, b: ItemResponse) => {
        const aCode = a.paperCode || ''
        const bCode = b.paperCode || ''
        return aCode.localeCompare(bCode, 'zh-CN', { numeric: true })
      })
      setItems(sortedData)
      setFilteredItems(sortedData)
    } catch (error) {
      message.error('加载条目数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  // 搜索筛选
  const handleSearch = (value: string) => {
    if (!value) {
      setFilteredItems(items)
    } else {
      const filtered = items.filter(
        (item) =>
          item.name.includes(value) ||
          item.description.includes(value) ||
          item.category.includes(value)
      )
      const sortedFiltered = filtered.sort((a: ItemResponse, b: ItemResponse) => {
        const aCode = a.paperCode || ''
        const bCode = b.paperCode || ''
        return aCode.localeCompare(bCode, 'zh-CN', { numeric: true })
      })
      setFilteredItems(sortedFiltered)
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的条目')
      return
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个条目吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => api.delete(`/items/${id}`))
          )
          message.success(`成功删除 ${selectedRowKeys.length} 个条目`)
          setSelectedRowKeys([])
          loadItems()
        } catch (error) {
          message.error('批量删除失败')
        }
      }
    })
  }

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  }

  // 新增条目
  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ status: '启用' })
    setModalVisible(true)
  }

  // 编辑条目
  const handleEdit = (record: ItemResponse) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  // 删除条目
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/items/${id}`)
      message.success('删除成功')
      loadItems()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 切换状态
  const handleToggleStatus = async (id: number, isActive: boolean) => {
    try {
      await api.put(`/items/${id}`, { status: isActive ? '启用' : '停用' })
      message.success('状态更新成功')
      loadItems()
    } catch (error) {
      message.error('状态更新失败')
    }
  }

  // 保存条目
  const handleSave = async (values: any) => {
    try {
      // 将department映射为center（后端使用center字段）
      const payload = {
        ...values,
        center: values.department || values.center
      }

      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, payload)
        message.success('更新成功')
      } else {
        await api.post('/items', payload)
        message.success('添加成功')
      }
      setModalVisible(false)
      loadItems()
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败')
    }
  }

  // 下载模板
  const downloadTemplate = () => {
    const template: ItemImportTemplate[] = [
      {
        公司: '铁路公司',
        '部门/中心': '技术中心',
        纸质编号: 'ZZ001',
        项目编号: 'XM001',
        项目名称: '安全操作规范',
        项目分类: '安全管理',
        项目分值: 10,
        项目说明: '严格按照安全操作规范执行作业',
        项目状态: '启用',
        分组名称: '安全类'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '条目模板')
    XLSX.writeFile(wb, '绩效条目导入模板.xlsx')
  }

  // Excel导入
  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData: ItemImportTemplate[] = XLSX.utils.sheet_to_json(worksheet)

        let successCount = 0
        let errorCount = 0

        for (const item of jsonData) {
          try {
            await api.post('/items', {
              company: item.公司,
              center: item['部门/中心'],
              paperCode: item.纸质编号,
              itemCode: item.项目编号,
              name: item.项目名称,
              category: item.项目分类,
              score: item.项目分值,
              description: item.项目说明,
              status: item.项目状态,
              groupName: item.分组名称
            })
            successCount++
          } catch (error) {
            errorCount++
          }
        }

        message.success(`成功导入 ${successCount} 条绩效条目${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`)
        loadItems()
      } catch (error) {
        message.error('导入失败，请检查文件格式')
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // 导出Excel
  const handleExport = () => {
    const exportData = filteredItems.map((item) => ({
      公司: item.company,
      '部门/中心': item.department || item.center,
      纸质编号: item.paperCode,
      项目编号: item.itemCode,
      项目名称: item.name,
      项目分类: item.category,
      项目分值: item.score,
      项目说明: item.description,
      项目状态: item.status,
      分组名称: item.groupName
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '绩效条目')
    XLSX.writeFile(wb, `绩效条目_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const columns: ColumnsType<ItemResponse> = [
    {
      title: '纸质编号',
      dataIndex: 'paperCode',
      key: 'paperCode',
      width: 120,
      ellipsis: true
    },
    {
      title: '项目编号',
      dataIndex: 'itemCode',
      key: 'itemCode',
      width: 120,
      ellipsis: true
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true
    },
    {
      title: '项目分类',
      dataIndex: 'category',
      key: 'category',
      width: 120
    },
    {
      title: '项目分值',
      dataIndex: 'score',
      key: 'score',
      width: 120,
      align: 'center'
    },
    {
      title: '项目说明',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true
    },
    {
      title: '项目状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: ItemResponse) => (
        <Switch
          checked={status === '启用'}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      )
    },
    {
      title: '分组名称',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 120,
      ellipsis: true
    },
    {
      title: '部门/中心',
      dataIndex: 'center',
      key: 'center',
      width: 120,
      ellipsis: true
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 120,
      ellipsis: true
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
            title="确定要删除这个条目吗？"
            onConfirm={() => handleDelete(record.id)}
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
      <Title level={2}>绩效管理办法</Title>

      <Card>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="条目总数" value={items.length} />
          </Col>
          <Col span={6}>
            <Statistic title="筛选结果" value={filteredItems.length} />
          </Col>
          <Col span={6}>
            <Statistic title="已选择" value={selectedRowKeys.length} />
          </Col>
          <Col span={6}>
            <Statistic
              title="启用条目"
              value={items.filter(item => item.status === '启用').length}
            />
          </Col>
        </Row>

        {/* 搜索区域 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Search
              placeholder="搜索条目（名称、描述、分类）"
              allowClear
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
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
                新增条目
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
          dataSource={filteredItems}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range?.[0]}-${range?.[1]} 条，共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑条目' : '新增条目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company"
                label="公司"
                rules={[{ required: true, message: '请输入公司' }]}
              >
                <Input placeholder="请输入公司" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="部门/中心"
                rules={[{ required: true, message: '请输入部门/中心' }]}
              >
                <Input placeholder="请输入部门/中心" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paperCode"
                label="纸质编号"
                rules={[{ required: true, message: '请输入纸质编号' }]}
              >
                <Input placeholder="请输入纸质编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="itemCode"
                label="项目编号"
                rules={[{ required: true, message: '请输入项目编号' }]}
              >
                <Input placeholder="请输入项目编号" disabled={!!editingItem} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="项目名称"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="请输入项目名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="项目分类"
                rules={[{ required: true, message: '请输入项目分类' }]}
              >
                <Input placeholder="请输入项目分类" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="score"
                label="项目分值"
                rules={[{ required: true, message: '请输入项目分值' }]}
              >
                <InputNumber
                  min={1}
                  max={100}
                  placeholder="请输入项目分值"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="groupName"
                label="分组名称"
                rules={[{ required: true, message: '请输入分组名称' }]}
              >
                <Input placeholder="请输入分组名称" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="项目说明"
            rules={[{ required: true, message: '请输入项目说明' }]}
          >
            <TextArea rows={3} placeholder="请输入项目说明" />
          </Form.Item>
          <Form.Item
            name="status"
            label="项目状态"
            rules={[{ required: true, message: '请选择项目状态' }]}
          >
            <Select placeholder="请选择项目状态">
              <Option value="启用">启用</Option>
              <Option value="停用">停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ItemManagement