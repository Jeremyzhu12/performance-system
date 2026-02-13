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
  DatePicker,
  message,
  Popconfirm,
  Upload,
  Row,
  Col,
  Statistic,
  Tag
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
  ExportOutlined,
  ImportOutlined,
  CopyOutlined,
  QuestionCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import api from '../services/api'
import { Record, Employee, Item, RecordImportTemplate } from '../types'
import { formatEmpNo, normalizeEmpNo } from '../utils'

const { Title } = Typography
const { Search, TextArea } = Input
const { Option } = Select
const { MonthPicker } = DatePicker

const PerformanceEntry: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([])
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Record | null>(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs())
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>()
  const [selectedItem, setSelectedItem] = useState<string | undefined>()
  const [selectedFormEmployee, setSelectedFormEmployee] = useState<Employee | null>(null)
  const [selectedFormEmployees, setSelectedFormEmployees] = useState<Employee[]>([]) // 多员工选择
  const [selectedFormItem, setSelectedFormItem] = useState<Item | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [jsonOutputVisible, setJsonOutputVisible] = useState(false)
  const [jsonInputVisible, setJsonInputVisible] = useState(false)
  const [jsonInputText, setJsonInputText] = useState('')
  const [helpVisible, setHelpVisible] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)

  // 使用HTTP API





  // 复制固定提示词到剪贴板
  const copyPromptToClipboard = async () => {
    const prompt = `# 角色
你是一个专业的企业绩效考核智能助手，凭借精准的分析能力和丰富的行业经验，负责依据输入的问题精准匹配绩效考核条目，并给出相应评分。

## 技能
### 技能 1: 绩效匹配
1. 接收输入的id、remarks的数组。
2. 仔细从绩效条目表（包含 itemCode、name、score，项目分类，其中score 有固定值或范围）和绩效案例表（包含 paperCode、itemCode、name、score、remarks，为历史人工判定案例）这两类知识库数据中，运用高效且精准的匹配算法找到最合适的【考核条目 name】。若遇到模糊或复杂情况，深入剖析知识库中数据的语义和逻辑关系进行综合判断。
3. 确定其对应的【 itemCode】和【 score】，当 score 是范围时，全面分析 remarks 的语义，从语义的细节、重点关键词等多维度判定具体分值；当 remarks 与某条案例相似时，优先参考案例中的 score。若发现知识库数据存在不完整或可能影响准确判断的情况，详细记录下来以便后续分析。
4. 始终以 JSON 数组形式输出结果，每条结果包含：id、itemCode、score、name。在输出前，严格检查数据是否完整且符合 JSON 数组格式要求，若存在数据为 null 的情况，重新审视匹配过程，看是否可以通过进一步优化规则找到合适的数据来填充，若实在无法找到合适数据，则输出清晰合理的提示信息说明该情况。

## 限制:
- 输出内容必须严格符合 JSON 数组格式要求，每条结果包含 id、itemCode、score、name 这些字段。确保 JSON 数组中的数据准确无误，无缺失或错误格式。
- 回答必须完全基于知识库中的数据进行匹配和判断。在匹配过程中，对知识库数据进行全面、细致、深入的分析，杜绝遗漏可能的匹配项。
- 若知识库中没有完全匹配的数据，依据明确的规则选择最接近的条目并按要求输出。
- 输出的所有信息都需基于知识库，不输出知识库以外无根据的内容。`

    try {
      await navigator.clipboard.writeText(prompt)
      message.success('固定提示词已复制到剪贴板')
    } catch (err) {
      message.error('复制失败，请手动复制')
    }
  }

  // 开始匹配功能
  const handleAutoMatch = async () => {
    if (!selectedMonth) {
      message.warning('请先选择月份')
      return
    }

    // 检查API配置 - 支持桌面应用和Web环境
    let apiKey = ''
    let workflowId = ''

    try {
      if (window.electronAPI) {
        // 桌面应用环境：从配置文件读取
        const configResult = await window.electronAPI.getConfig()
        if (configResult.success) {
          apiKey = configResult.data.VITE_COZE_API_KEY || ''
          workflowId = configResult.data.VITE_COZE_WORKFLOW_ID || ''
        }
      } else {
        // Web环境：从环境变量读取
        apiKey = import.meta.env.VITE_COZE_API_KEY || ''
        workflowId = import.meta.env.VITE_COZE_WORKFLOW_ID || ''
      }
    } catch (error) {
      console.error('读取API配置失败:', error)
    }

    if (!apiKey || apiKey === 'your_coze_api_key_here') {
      Modal.error({
        title: 'API配置错误',
        content: (
          <div>
            <p>请先配置Coze API密钥：</p>
            <ol>
              <li>点击左侧菜单的"API管理"</li>
              <li>输入管理员密码：!nbdt2025</li>
              <li>填入真实的API密钥和工作流ID</li>
              <li>保存配置并重启应用</li>
            </ol>
            <p style={{ marginTop: '16px', color: '#666' }}>
              API密钥可从 <a href="https://www.coze.cn/" target="_blank" rel="noopener noreferrer">Coze官网</a> 获取
            </p>
          </div>
        ),
        width: 500
      })
      return
    }

    if (!workflowId || workflowId === 'your_workflow_id_here') {
      Modal.error({
        title: '工作流配置错误',
        content: (
          <div>
            <p>请在 <code>.env</code> 文件中配置正确的工作流ID</p>
            <p style={{ color: '#666' }}>工作流ID可从Coze工作流页面获取</p>
          </div>
        ),
        width: 400
      })
      return
    }

    // 筛选当前月份中itemCode为空或未定义的记录
    const unmatchedRecords = records.filter(record =>
      record.month === selectedMonth.format('YYYY-MM') && (!record.itemCode || record.itemCode.trim() === '')
    )

    if (unmatchedRecords.length === 0) {
      message.info('当前月份没有需要匹配的记录')
      return
    }

    setMatchLoading(true)

    try {
      // 准备发送给API的数据
      const requestData = unmatchedRecords.map(record => ({
        id: record.id,
        remarks: record.remarks || ''
      }))

      console.log('发送给Coze工作流的参数:', {
        workflow_id: workflowId,
        parameters: {
          input: requestData
        }
      })
      console.log('待匹配记录数量:', requestData.length)

      // 调用Coze工作流API
      const response = await fetch('https://api.coze.cn/v1/workflow/stream_run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          parameters: {
            input: requestData
          }
        })
      })

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`

        if (response.status === 401) {
          errorMessage = 'API密钥无效或已过期，请检查配置'
        } else if (response.status === 403) {
          errorMessage = 'API访问被拒绝，请检查权限设置'
        } else if (response.status === 404) {
          errorMessage = '工作流不存在，请检查工作流ID'
        } else if (response.status >= 500) {
          errorMessage = 'Coze服务器错误，请稍后重试'
        }

        // 尝试获取详细错误信息
        try {
          const errorData = await response.json()
          if (errorData.msg) {
            errorMessage += `: ${errorData.msg}`
          }
        } catch {
          // 忽略解析错误
        }

        throw new Error(errorMessage)
      }

      // 处理流式响应数据
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let matchResults: any[] = []
      let finalResult = null

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.trim() === '') continue

            // 处理 Server-Sent Events 格式
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim()
              if (dataStr === '[DONE]') continue

              try {
                const eventData = JSON.parse(dataStr)
                console.log('收到流式数据:', eventData)

                // 检查是否是最终结果
                if (eventData.event === 'workflow.finish' && eventData.data) {
                  finalResult = eventData.data
                  console.log('工作流完成，最终结果:', finalResult)
                }

                // 增强调试日志，输出完整的事件数据结构
                console.log('收到事件数据:', JSON.stringify(eventData, null, 2))

                // 检查是否包含匹配结果
                if ((eventData.data && eventData.data.output) || eventData.content) {
                  try {
                    let allMatchResults = []

                    // 首先检查是否需要解析content字段
                    let outputData = eventData.data ? eventData.data.output : null
                    if (!outputData && eventData.content) {
                      console.log('🔍 [流式] 检测到content字段，尝试解析:', eventData.content)
                      try {
                        const contentParsed = JSON.parse(eventData.content)
                        console.log('✅ [流式] content解析成功:', contentParsed)
                        outputData = contentParsed.output
                      } catch (contentParseError) {
                        console.error('❌ [流式] content解析失败:', (contentParseError as Error).message)
                        console.error('[流式] 原始content:', eventData.content)
                      }
                    }

                    console.log('🔍 [流式] 最终使用的outputData:', outputData)
                    console.log('🔍 [流式] outputData类型:', typeof outputData, Array.isArray(outputData) ? '(数组)' : '')
                    console.log('🔍 [流式] outputData长度:', Array.isArray(outputData) ? outputData.length : 'N/A')

                    // 处理嵌套的output格式
                    if (Array.isArray(outputData)) {
                      for (const item of outputData) {
                        if (item.output) {
                          try {
                            let outputStr = item.output

                            // 处理可能存在的```json```包装格式
                            if (outputStr.includes('```json')) {
                              const jsonMatch = outputStr.match(/```json\s*([\s\S]*?)\s*```/)
                              if (jsonMatch) {
                                outputStr = jsonMatch[1].trim()
                              }
                            }

                            // 处理直接的JSON字符串格式（去除可能的转义字符）
                            if (typeof outputStr === 'string') {
                              console.log('🔍 [流式] 处理字符串类型的output:', outputStr)
                              console.log('🔍 [流式] 字符串长度:', outputStr.length)
                              console.log('🔍 [流式] 字符串前50个字符:', outputStr.substring(0, 50))

                              // 如果是转义的JSON字符串，先解转义
                              try {
                                // 尝试直接解析
                                console.log('📝 [流式] 尝试直接解析JSON...')
                                const parsed = JSON.parse(outputStr)
                                console.log('✅ [流式] 直接解析成功:', parsed)
                                console.log('📋 [流式] 解析结果类型:', typeof parsed, Array.isArray(parsed) ? '(数组)' : '')

                                if (Array.isArray(parsed)) {
                                  console.log('📋 [流式] 添加数组项，长度:', parsed.length)
                                  allMatchResults.push(...parsed)
                                } else if (parsed && typeof parsed === 'object') {
                                  console.log('📋 [流式] 添加对象项:', parsed)
                                  allMatchResults.push(parsed)
                                }
                              } catch (firstParseError) {
                                console.log('❌ [流式] 直接解析失败:', (firstParseError as Error).message)
                                // 如果直接解析失败，可能是双重转义的JSON
                                try {
                                  console.log('📝 [流式] 尝试双重转义解析...')
                                  const unescaped = JSON.parse(outputStr)
                                  console.log('📝 [流式] 第一次解转义结果:', unescaped, '类型:', typeof unescaped)

                                  if (typeof unescaped === 'string') {
                                    console.log('📝 [流式] 进行第二次解析...')
                                    const finalParsed = JSON.parse(unescaped)
                                    console.log('✅ [流式] 第二次解析成功:', finalParsed)
                                    console.log('📋 [流式] 最终结果类型:', typeof finalParsed, Array.isArray(finalParsed) ? '(数组)' : '')

                                    if (Array.isArray(finalParsed)) {
                                      console.log('📋 [流式] 添加最终数组项，长度:', finalParsed.length)
                                      allMatchResults.push(...finalParsed)
                                    } else if (finalParsed && typeof finalParsed === 'object') {
                                      console.log('📋 [流式] 添加最终对象项:', finalParsed)
                                      allMatchResults.push(finalParsed)
                                    }
                                  } else {
                                    console.log('⚠️ [流式] 第一次解转义后不是字符串，直接使用:', unescaped)
                                    if (Array.isArray(unescaped)) {
                                      allMatchResults.push(...unescaped)
                                    } else if (unescaped && typeof unescaped === 'object') {
                                      allMatchResults.push(unescaped)
                                    }
                                  }
                                } catch (secondParseError) {
                                  console.error('❌ [流式] 双重转义解析也失败:', (secondParseError as Error).message)
                                  console.error('[流式] 原始数据:', item.output)
                                  console.error('[流式] 第一次解析错误:', firstParseError)
                                  console.error('[流式] 第二次解析错误:', secondParseError)
                                }
                              }
                            } else {
                              console.log('🔍 [流式] 处理非字符串类型的output:', typeof outputStr, outputStr)
                              // 如果不是字符串，直接处理
                              if (Array.isArray(outputStr)) {
                                console.log('📋 [流式] 直接添加数组，长度:', outputStr.length)
                                allMatchResults.push(...outputStr)
                              } else if (outputStr && typeof outputStr === 'object') {
                                console.log('📋 [流式] 直接添加对象:', outputStr)
                                allMatchResults.push(outputStr)
                              }
                            }
                          } catch (e) {
                            console.warn('解析output项失败:', item.output, e)
                          }
                        }
                      }
                    } else {
                      const output = typeof outputData === 'string'
                        ? JSON.parse(outputData)
                        : outputData

                      if (Array.isArray(output)) {
                        allMatchResults = output
                      } else if (output.results && Array.isArray(output.results)) {
                        allMatchResults = output.results
                      }
                    }

                    console.log('🔍 [流式] 所有匹配结果数量:', allMatchResults.length)
                    console.log('🔍 [流式] 所有匹配结果内容:', allMatchResults)

                    if (allMatchResults.length > 0) {
                      matchResults = allMatchResults
                      console.log('✅ [流式] 成功设置匹配结果，数量:', matchResults.length)
                    } else {
                      console.warn('⚠️ [流式] 未找到任何匹配结果')
                    }
                  } catch (parseError) {
                    console.warn('解析输出数据失败:', (parseError as Error).message)
                  }
                }

                // 处理只有debug_url的情况
                const debugUrl = (eventData.data && eventData.data.debug_url) || eventData.debug_url
                const hasOutput = (eventData.data && eventData.data.output) || eventData.content
                if (debugUrl && !hasOutput) {
                  console.warn('工作流执行完成但未返回输出数据，debug_url:', debugUrl)
                  console.warn('这可能表明工作流配置有问题，请检查工作流是否正确配置了输出节点')
                }
              } catch (parseError) {
                console.warn('解析流式数据失败:', (parseError as Error).message, '原始数据:', dataStr)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // 如果有最终结果，优先使用最终结果
      if (finalResult) {
        console.log('最终结果数据结构:', JSON.stringify(finalResult, null, 2))

        // 首先检查是否需要解析content字段
        let finalOutputData = finalResult.output
        if (!finalOutputData && finalResult.content) {
          console.log('🔍 [最终] 检测到content字段，尝试解析:', finalResult.content)
          try {
            const contentParsed = JSON.parse(finalResult.content)
            console.log('✅ [最终] content解析成功:', contentParsed)
            finalOutputData = contentParsed.output
          } catch (contentParseError) {
            console.error('❌ [最终] content解析失败:', (contentParseError as Error).message)
            console.error('[最终] 原始content:', finalResult.content)
          }
        }

        console.log('🔍 [最终] 最终使用的outputData:', finalOutputData)

        if (finalOutputData) {
          try {
            let allMatchResults = []

            // 处理嵌套的output格式
            if (Array.isArray(finalOutputData)) {
              for (const item of finalOutputData) {
                if (item.output) {
                  try {
                    let outputStr = item.output

                    // 处理可能存在的```json```包装格式
                    if (outputStr.includes('```json')) {
                      const jsonMatch = outputStr.match(/```json\s*([\s\S]*?)\s*```/)
                      if (jsonMatch) {
                        outputStr = jsonMatch[1].trim()
                      }
                    }

                    // 处理直接的JSON字符串格式（去除可能的转义字符）
                    if (typeof outputStr === 'string') {
                      console.log('🔍 处理字符串类型的output:', outputStr)
                      console.log('🔍 字符串长度:', outputStr.length)
                      console.log('🔍 字符串前50个字符:', outputStr.substring(0, 50))

                      // 如果是转义的JSON字符串，先解转义
                      try {
                        // 尝试直接解析
                        console.log('📝 尝试直接解析JSON...')
                        const parsed = JSON.parse(outputStr)
                        console.log('✅ 直接解析成功:', parsed)
                        console.log('📋 解析结果类型:', typeof parsed, Array.isArray(parsed) ? '(数组)' : '')

                        if (Array.isArray(parsed)) {
                          console.log('📋 添加数组项，长度:', parsed.length)
                          allMatchResults.push(...parsed)
                        } else if (parsed && typeof parsed === 'object') {
                          console.log('📋 添加对象项:', parsed)
                          allMatchResults.push(parsed)
                        }
                      } catch (firstParseError) {
                        console.log('❌ 直接解析失败:', (firstParseError as Error).message)
                        // 如果直接解析失败，可能是双重转义的JSON
                        try {
                          console.log('📝 尝试双重转义解析...')
                          const unescaped = JSON.parse(outputStr)
                          console.log('📝 第一次解转义结果:', unescaped, '类型:', typeof unescaped)

                          if (typeof unescaped === 'string') {
                            console.log('📝 进行第二次解析...')
                            const finalParsed = JSON.parse(unescaped)
                            console.log('✅ 第二次解析成功:', finalParsed)
                            console.log('📋 最终结果类型:', typeof finalParsed, Array.isArray(finalParsed) ? '(数组)' : '')

                            if (Array.isArray(finalParsed)) {
                              console.log('📋 添加最终数组项，长度:', finalParsed.length)
                              allMatchResults.push(...finalParsed)
                            } else if (finalParsed && typeof finalParsed === 'object') {
                              console.log('📋 添加最终对象项:', finalParsed)
                              allMatchResults.push(finalParsed)
                            }
                          } else {
                            console.log('⚠️ 第一次解转义后不是字符串，直接使用:', unescaped)
                            if (Array.isArray(unescaped)) {
                              allMatchResults.push(...unescaped)
                            } else if (unescaped && typeof unescaped === 'object') {
                              allMatchResults.push(unescaped)
                            }
                          }
                        } catch (secondParseError) {
                          console.error('❌ 双重转义解析也失败:', (secondParseError as Error).message)
                          console.error('原始数据:', item.output)
                          console.error('第一次解析错误:', firstParseError)
                          console.error('第二次解析错误:', secondParseError)
                        }
                      }
                    } else {
                      console.log('🔍 处理非字符串类型的output:', typeof outputStr, outputStr)
                      // 如果不是字符串，直接处理
                      if (Array.isArray(outputStr)) {
                        console.log('📋 直接添加数组，长度:', outputStr.length)
                        allMatchResults.push(...outputStr)
                      } else if (outputStr && typeof outputStr === 'object') {
                        console.log('📋 直接添加对象:', outputStr)
                        allMatchResults.push(outputStr)
                      }
                    }
                  } catch (e) {
                    console.warn('解析output项失败:', item.output, e)
                  }
                }
              }
            } else {
              const output = typeof finalOutputData === 'string'
                ? JSON.parse(finalOutputData)
                : finalOutputData

              if (Array.isArray(output)) {
                allMatchResults = output
              } else if (output.results && Array.isArray(output.results)) {
                allMatchResults = output.results
              }
            }

            if (allMatchResults.length > 0) {
              matchResults = allMatchResults
            }
          } catch (parseError) {
            console.warn('解析最终结果失败:', (parseError as Error).message)
          }
        } else if (finalResult.debug_url) {
          // 处理只有debug_url的情况
          console.warn('工作流执行完成但未返回输出数据')
          console.warn('Debug URL:', finalResult.debug_url)
          console.warn('Node Execute UUID:', finalResult.node_execute_uuid)
        }
      }

      console.log('最终匹配结果:', matchResults)

      // 验证匹配结果
      if (!Array.isArray(matchResults) || matchResults.length === 0) {
        console.warn('未获取到有效的匹配结果')

        // 检查是否有debug_url，提供更详细的错误信息
        if (finalResult && finalResult.debug_url) {
          Modal.error({
            title: '工作流配置问题',
            content: (
              <div>
                <p>工作流执行完成，但未返回匹配结果。这通常表明工作流配置有问题。</p>
                <p><strong>可能的原因：</strong></p>
                <ul>
                  <li>工作流中缺少输出节点或输出节点配置错误</li>
                  <li>工作流逻辑有误，未能生成预期的输出数据</li>
                  <li>输出数据格式与代码期望的格式不匹配</li>
                </ul>
                <p><strong>解决建议：</strong></p>
                <ul>
                  <li>访问调试页面查看工作流执行详情：<br />
                    <a href={finalResult.debug_url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                      {finalResult.debug_url}
                    </a>
                  </li>
                  <li>检查工作流是否包含正确的输出节点</li>
                  <li>确认输出数据格式为数组或包含results字段的对象</li>
                </ul>
              </div>
            ),
            width: 600
          })
        } else {
          message.warning('工作流执行完成，但未返回匹配结果。请检查工作流配置或稍后重试。')
        }
        return
      }

      // 更新记录
      let updatedCount = 0
      const updatedRecords = records.map(record => {
        const matchResult = matchResults.find((match: any) => match.id === record.id)
        if (matchResult) {
          updatedCount++
          return {
            ...record,
            itemCode: matchResult.itemCode || record.itemCode,
            score: matchResult.score !== undefined ? matchResult.score : record.score
          }
        }
        return record
      })

      // 保存更新到数据库
      for (const record of updatedRecords) {
        if (record.id) {
          const matchResult = matchResults.find((match: any) => match.id === record.id)
          if (matchResult) {
            console.log(`保存记录到数据库: id=${record.id}, itemCode=${matchResult.itemCode}, score=${matchResult.score}`)
            await api.put(`/records/${record.id}`, {
              itemCode: matchResult.itemCode || record.itemCode,
              score: matchResult.score !== undefined ? matchResult.score : record.score
            })
            console.log(`记录 ${record.id} 保存成功`)
          }
        }
      }

      setRecords(updatedRecords)
      console.log(`匹配完成，前端状态已更新，数据库已保存 ${updatedCount} 条记录`)
      message.success(`匹配完成，成功更新 ${updatedCount} 条记录`)

      // 重新加载数据以验证保存是否成功
      await loadRecords()
    } catch (error) {
      console.error('匹配失败:', error)

      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('API密钥')) {
          Modal.error({
            title: 'API认证失败',
            content: (
              <div>
                <p>API密钥验证失败，请检查以下配置：</p>
                <ul>
                  <li>确认 <code>.env</code> 文件中的API密钥是否正确</li>
                  <li>确认API密钥是否有效且未过期</li>
                  <li>确认API密钥是否有访问该工作流的权限</li>
                </ul>
                <p style={{ marginTop: '16px', color: '#666' }}>
                  如需帮助，请访问 <a href="https://www.coze.cn/docs" target="_blank" rel="noopener noreferrer">Coze文档</a>
                </p>
              </div>
            ),
            width: 500
          })
        } else if (error.message.includes('无法读取响应流')) {
          Modal.error({
            title: '数据流读取失败',
            content: (
              <div>
                <p>无法读取API响应流，可能的原因：</p>
                <ul>
                  <li>网络连接不稳定</li>
                  <li>浏览器不支持流式数据读取</li>
                  <li>API服务暂时不可用</li>
                </ul>
                <p style={{ marginTop: '16px' }}>请稍后重试，或检查网络连接。</p>
              </div>
            ),
            width: 500
          })
        } else if (error.message.includes('JSON') || error.message.includes('parse')) {
          Modal.error({
            title: '数据解析失败',
            content: (
              <div>
                <p>API返回的数据格式异常，无法正确解析。</p>
                <p>这可能是工作流配置问题，请检查：</p>
                <ul>
                  <li>工作流是否正确配置了输出格式</li>
                  <li>工作流ID是否正确</li>
                  <li>工作流是否已发布并可用</li>
                </ul>
                <p style={{ marginTop: '16px', color: '#666' }}>错误详情: {error.message}</p>
              </div>
            ),
            width: 500
          })
        } else {
          message.error(`匹配失败: ${error.message}`)
        }
      } else {
        message.error('匹配失败: 未知错误')
      }
    } finally {
      setMatchLoading(false)
    }
  }

  // 加载基础数据
  const loadBaseData = async () => {
    try {
      const [empRes, itemRes]: any[] = await Promise.all([
        api.get('/employees'),
        api.get('/items')
      ])
      setEmployees(empRes.data || [])
      setItems((itemRes.data || []).filter((i: any) => i.status === '启用'))
    } catch (error) {
      message.error('加载基础数据失败')
    }
  }

  // 刷新数据
  const handleRefreshData = async () => {
    setRefreshLoading(true)
    try {
      await loadBaseData()
      message.success('数据刷新成功')
    } catch (error) {
      message.error('数据刷新失败')
    } finally {
      setRefreshLoading(false)
    }
  }

  // 加载记录数据
  const loadRecords = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (selectedMonth) {
        params.year = selectedMonth.year()
        params.month = selectedMonth.month() + 1
      }
      const response: any = await api.get('/records', { params })
      const data = (response.data || []).map((r: any) => ({
        ...r,
        month: `${r.year}-${String(r.month).padStart(2, '0')}`
      }))
      setRecords(data)
      filterRecords(data)
    } catch (error) {
      message.error('加载记录数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 筛选记录
  const filterRecords = (data: Record[] = records) => {
    let filtered = data

    // 按月份筛选
    if (selectedMonth) {
      const monthStr = selectedMonth.format('YYYY-MM')
      filtered = filtered.filter(record => record.month.startsWith(monthStr))
    }

    // 按员工筛选
    if (selectedEmployee) {
      filtered = filtered.filter(record => String(record.empNo) === String(selectedEmployee))
    }

    // 按条目筛选
    if (selectedItem) {
      filtered = filtered.filter(record => record.itemCode === selectedItem)
    }

    // 按搜索文本筛选
    if (searchText) {
      filtered = filtered.filter(record => {
        const employee = employees.find(emp => String(emp.empNo) === String(record.empNo))
        const item = items.find(itm => itm.itemCode === record.itemCode)
        return (
          employee?.name.includes(searchText) ||
          employee?.empNo.includes(searchText) ||
          item?.name.includes(searchText) ||
          record.remarks?.includes(searchText)
        )
      })
    }

    setFilteredRecords(filtered)
  }

  // 优化：合并初始加载和筛选逻辑，避免重复渲染
  useEffect(() => {
    const initializeData = async () => {
      await loadBaseData()
      await loadRecords()
    }
    initializeData()
  }, [])

  // 使用useMemo优化筛选计算
  const memoizedFilteredRecords = React.useMemo(() => {
    if (!records.length || !employees.length || !items.length) return []

    return records.filter(record => {
      const matchesMonth = !selectedMonth || record.month === selectedMonth.format('YYYY-MM')
      const matchesEmployee = !selectedEmployee || record.empNo === selectedEmployee
      const matchesItem = !selectedItem || record.itemCode === selectedItem
      const matchesSearch = !searchText ||
        record.remarks?.toLowerCase().includes(searchText.toLowerCase()) ||
        employees.find(emp => emp.empNo === record.empNo)?.name.toLowerCase().includes(searchText.toLowerCase()) ||
        items.find(item => item.itemCode === record.itemCode)?.name.toLowerCase().includes(searchText.toLowerCase())

      return matchesMonth && matchesEmployee && matchesItem && matchesSearch
    })
  }, [selectedMonth, selectedEmployee, selectedItem, searchText, records, employees, items])

  // 更新筛选结果
  useEffect(() => {
    setFilteredRecords(memoizedFilteredRecords)
  }, [memoizedFilteredRecords])

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value)
  }

  // 月份选择处理
  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    setSelectedMonth(date || dayjs())
  }

  // 新增记录
  const handleAdd = () => {
    setEditingRecord(null)
    setSelectedFormEmployee(null)
    setSelectedFormEmployees([]) // 清空多员工选择
    setSelectedFormItem(null)
    form.resetFields()
    form.setFieldsValue({ month: selectedMonth.format('YYYY-MM') })
    setModalVisible(true)
  }

  // 编辑记录
  const handleEdit = (record: Record) => {
    setEditingRecord(record)
    const employee = employees.find(emp => String(emp.empNo) === String(record.empNo))
    const item = items.find(itm => itm.itemCode === record.itemCode)
    setSelectedFormEmployee(employee || null)
    setSelectedFormEmployees([]) // 编辑模式清空多员工选择
    setSelectedFormItem(item || null)
    form.setFieldsValue({
      empNo: record.empNo,
      itemCode: record.itemCode,
      month: record.month,
      score: record.score,
      remarks: record.remarks
    })
    setModalVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/records/${id}`)
      message.success('删除成功')
      loadRecords()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 员工选择处理（单选模式 - 编辑时使用）
  const handleEmployeeSelect = (empNo: string) => {
    const employee = employees.find(emp => String(emp.empNo) === String(empNo))
    setSelectedFormEmployee(employee || null)
    form.setFieldsValue({ empNo })
  }

  // 多员工选择处理（新增模式使用）
  const handleMultiEmployeeSelect = (empNos: string[]) => {
    const selectedEmps = empNos.map(empNo =>
      employees.find(emp => String(emp.empNo) === String(empNo))
    ).filter(Boolean) as Employee[]
    setSelectedFormEmployees(selectedEmps)
    form.setFieldsValue({ empNos })
  }

  // 项目选择处理
  const handleItemSelect = (itemCode: string) => {
    const item = items.find(itm => itm.itemCode === itemCode)
    setSelectedFormItem(item || null)
    form.setFieldsValue({ itemCode })
  }

  // 保存记录
  const handleSave = async (values: any) => {
    try {
      if (editingRecord) {
        // 编辑模式：单条记录更新
        const monthParts = values.month ? values.month.split('-') : [selectedMonth.year(), selectedMonth.month() + 1]
        const recordData = {
          empNo: values.empNo,
          itemCode: values.itemCode,
          year: parseInt(String(monthParts[0])),
          month: parseInt(String(monthParts[1])),
          score: values.score,
          remarks: values.remarks || ''
        }
        await api.put(`/records/${editingRecord.id!}`, recordData)
        message.success('更新成功')
      } else {
        // 新增模式：支持多员工批量创建
        const empNos = values.empNos || (values.empNo ? [values.empNo] : [])
        if (empNos.length === 0) {
          message.error('请至少选择一名员工')
          return
        }

        const monthParts = values.month ? values.month.split('-') : [selectedMonth.year(), selectedMonth.month() + 1]
        const baseRecordData = {
          itemCode: values.itemCode,
          year: parseInt(String(monthParts[0])),
          month: parseInt(String(monthParts[1])),
          score: values.score,
          remarks: values.remarks || ''
        }

        // 为每个选中的员工创建记录
        const createPromises = empNos.map((empNo: string) =>
          api.post('/records', {
            ...baseRecordData,
            empNo
          })
        )

        await Promise.all(createPromises)
        message.success(`成功为 ${empNos.length} 名员工添加记录`)
      }

      setModalVisible(false)
      setSelectedFormEmployee(null)
      setSelectedFormEmployees([])
      setSelectedFormItem(null)
      loadRecords()
    } catch (error) {
      message.error(editingRecord ? '更新失败' : '添加失败')
    }
  }

  // 下载模板
  const downloadTemplate = () => {
    const template: RecordImportTemplate[] = [
      {
        '工号(*)': '666666',
        '姓名(*)': '张三',
        岗位: '值班员',
        '登记说明(*)': '8月5日14:22岗位上打瞌睡',
        项目名称: '当班期间玩手机或其它电子设备；当班在岗位上睡觉；当班用车站电脑玩游戏、看电影等',
        加减分: -10,
        项目编号: 'A101537',
        纸质编号: '表7-4',
        项目说明: '劳动纪律（责任人考核-10，值班站长连带-2~-5）',
        考核月份: '2025-08'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '绩效登记模板')
    XLSX.writeFile(wb, '绩效登记导入模板.xlsx')
  }

  // Excel导入
  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData: RecordImportTemplate[] = XLSX.utils.sheet_to_json(worksheet)

        // 调试信息：显示当前员工数组状态和Excel中的工号
        console.log('=== 绩效导入调试信息 ===')
        console.log('当前employees数组长度:', employees.length)
        console.log('当前employees数组:', employees.map(emp => ({ id: emp.id, empNo: emp.empNo, empNoType: typeof emp.empNo, name: emp.name })))

        // 尝试多种可能的工号列名
        const possibleEmpNoColumns = ['工号(*)', '工号', '员工工号', '工号(必填)', '员工编号']
        let empNoColumn = null
        for (const col of possibleEmpNoColumns) {
          if (jsonData.length > 0 && jsonData[0].hasOwnProperty(col)) {
            empNoColumn = col
            break
          }
        }

        console.log('检测到的工号列名:', empNoColumn)
        console.log('Excel中的工号列表:', jsonData.map((item, index) => ({
          row: index + 2,
          empNo: empNoColumn ? item[empNoColumn] : undefined,
          empNoType: empNoColumn ? typeof item[empNoColumn] : 'undefined',
          name: item['姓名(*)'] || item['姓名'] || item['员工姓名']
        })))
        console.log('========================')

        const records: Omit<Record, 'id'>[] = []
        const invalidItems: { row: number; empNo: string; itemCode: string; itemName: string; reason: string }[] = []

        for (let index = 0; index < jsonData.length; index++) {
          const item = jsonData[index]
          const rowNumber = index + 2 // Excel行号从2开始（第1行是标题）

          console.log(`处理第${rowNumber}行数据:`, item)

          // 获取Excel中的工号，支持多种列名格式
          const possibleEmpNoColumns = ['工号(*)', '工号', '员工工号', '工号(必填)', '员工编号']
          let excelEmpNo = null
          for (const col of possibleEmpNoColumns) {
            if (item.hasOwnProperty(col) && item[col] !== undefined && item[col] !== null && item[col] !== '') {
              excelEmpNo = item[col]
              break
            }
          }

          // 验证必填字段
          if (!excelEmpNo) {
            console.warn(`第${rowNumber}行: 工号为空，跳过`)
            continue
          }

          // 获取考核月份，支持多种列名格式
          const possibleMonthColumns = ['考核月份', '月份', '考核期间']
          let monthValue = selectedMonth.format('YYYY-MM') // 默认使用当前选择的月份
          for (const col of possibleMonthColumns) {
            if (item.hasOwnProperty(col) && item[col] !== undefined && item[col] !== null && item[col] !== '') {
              monthValue = item[col]
              break
            }
          }

          console.log(`第${rowNumber}行: 工号=${excelEmpNo}, 月份=${monthValue}`)

          // 员工验证逻辑：使用规范化的工号进行匹配
          const employee = employees.find(emp => {
            const normalizedEmpNo = normalizeEmpNo(emp.empNo)
            const normalizedExcelEmpNo = normalizeEmpNo(excelEmpNo)

            console.log(`比较工号: DB[${normalizedEmpNo}] vs Excel[${normalizedExcelEmpNo}]`)

            return normalizedEmpNo === normalizedExcelEmpNo
          })

          if (!employee) {
            // 员工不存在
            invalidItems.push({
              row: rowNumber,
              empNo: excelEmpNo || '(空)',
              itemCode: item.项目编号 || '(空)',
              itemName: item.项目名称 || '(空)',
              reason: '员工工号在员工表中不存在'
            })
            continue
          }

          // 检查项目编号和项目名称是否有值
          const hasItemCode = item.项目编号 && item.项目编号.toString().trim() !== ''
          const hasItemName = item.项目名称 && item.项目名称.toString().trim() !== ''

          let performanceItem = null
          let itemCode = ''

          if (hasItemCode || hasItemName) {
            // 如果有项目编号或项目名称，尝试匹配
            performanceItem = items.find(itm =>
              (hasItemCode && itm.itemCode === item.项目编号) ||
              (hasItemName && itm.name === item.项目名称)
            )

            if (performanceItem) {
              itemCode = performanceItem.itemCode
            }
            // 如果匹配不到，itemCode保持为空字符串，仍然允许导入
          }
          // 如果项目编号和项目名称都为空，itemCode保持为空字符串，允许导入

          // 无论是否匹配到条目，都允许导入记录
          records.push({
            empNo: formatEmpNo(excelEmpNo), // 使用格式化函数确保6位数格式
            itemCode: itemCode || '', // 允许空的itemCode
            month: monthValue, // 确保月份不为空
            score: item.加减分 || 0, // 确保分数不为空
            remarks: item['登记说明(*)'] || item['登记说明'] || item['备注'] || ''
          })

          console.log(`添加记录: 工号=${formatEmpNo(excelEmpNo)}, 月份=${monthValue}, 分数=${item.加减分}`)
        }

        if (records.length > 0) {
          try {
            await Promise.all(records.map(r => {
              const monthParts = r.month ? r.month.split('-') : [selectedMonth.year(), selectedMonth.month() + 1]
              return api.post('/records', {
                empNo: r.empNo,
                itemCode: r.itemCode,
                year: parseInt(String(monthParts[0])),
                month: parseInt(String(monthParts[1])),
                score: r.score,
                remarks: r.remarks
              })
            }))

            if (invalidItems.length > 0) {
              // 显示详细的错误信息
              const errorDetails = invalidItems.map(item =>
                `第${item.row}行: 工号"${item.empNo}"，项目编号"${item.itemCode}"，项目名称"${item.itemName}" - ${item.reason}`
              ).join('\n')

              Modal.warning({
                title: `导入完成：成功导入 ${records.length} 条记录，${invalidItems.length} 条记录因员工不存在而跳过`,
                content: (
                  <div>
                    <p>导入结果：</p>
                    <ul style={{ marginBottom: '16px' }}>
                      <li style={{ color: '#52c41a' }}>成功导入：{records.length} 条</li>
                      <li style={{ color: '#ff4d4f' }}>员工验证失败：{invalidItems.length} 条</li>
                    </ul>
                    <p>失败记录详情：</p>
                    <pre style={{ maxHeight: '300px', overflow: 'auto', fontSize: '12px' }}>
                      {errorDetails}
                    </pre>
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                      <p style={{ margin: 0, color: '#52c41a', fontWeight: 'bold' }}>💡 解决建议：</p>
                      <ul style={{ margin: '8px 0 0 0', color: '#389e0d' }}>
                        <li>请前往"员工管理"页面检查员工工号是否存在</li>
                        <li>确认Excel中的"工号"列是否填写正确</li>
                        <li>如果员工不存在，请先在员工管理页面添加相应的员工信息，然后重新导入</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                      <p style={{ margin: 0, color: '#1890ff', fontWeight: 'bold' }}>ℹ️ 提示：</p>
                      <ul style={{ margin: '8px 0 0 0', color: '#096dd9' }}>
                        <li>项目编号和项目名称现在为可选项，可以为空</li>
                        <li>如果项目编号或项目名称为空，可以后续使用"开始匹配"功能自动填充</li>
                        <li>如果项目编号或项目名称在条目库中找不到匹配，记录仍会导入但项目编号为空</li>
                      </ul>
                    </div>
                  </div>
                ),
                width: 800
              })
            } else {
              message.success(`成功导入 ${records.length} 条绩效记录`)
            }
            loadRecords()
          } catch (error) {
            console.error('导入错误:', error)
            message.error('导入失败，请检查文件格式是否正确')
          }
        } else {
          // 当没有任何记录成功导入时的详细错误提示
          const errorDetails = invalidItems.map(item =>
            `第${item.row}行: 工号"${item.empNo}"，项目编号"${item.itemCode}"，项目名称"${item.itemName}" - ${item.reason}`
          ).join('\n')

          Modal.error({
            title: '导入失败：没有任何记录能够成功导入',
            content: (
              <div>
                <p>导入失败原因：所有记录的员工工号都不存在</p>
                <ul style={{ marginBottom: '16px' }}>
                  <li style={{ color: '#ff4d4f' }}>员工验证失败：{invalidItems.length} 条</li>
                </ul>
                <p>失败记录详情：</p>
                <pre style={{ maxHeight: '300px', overflow: 'auto', fontSize: '12px' }}>
                  {errorDetails}
                </pre>
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                  <p style={{ margin: 0, color: '#52c41a', fontWeight: 'bold' }}>💡 解决建议：</p>
                  <ul style={{ margin: '8px 0 0 0', color: '#389e0d' }}>
                    <li>请前往"员工管理"页面检查员工工号是否存在</li>
                    <li>确认Excel中的"工号"列是否填写正确</li>
                    <li>如果员工不存在，请先在员工管理页面添加相应的员工信息</li>
                    <li>添加员工后，请重新导入Excel文件</li>
                  </ul>
                </div>
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                  <p style={{ margin: 0, color: '#1890ff', fontWeight: 'bold' }}>ℹ️ 提示：</p>
                  <ul style={{ margin: '8px 0 0 0', color: '#096dd9' }}>
                    <li>项目编号和项目名称现在为可选项，不会导致导入失败</li>
                    <li>只要员工工号存在，记录就会被成功导入</li>
                    <li>项目编号为空的记录可以后续使用"开始匹配"功能自动填充</li>
                  </ul>
                </div>
              </div>
            ),
            width: 800
          })
        }
      } catch (error) {
        console.error('导入错误:', error)
        message.error('导入失败，请检查文件格式是否正确')
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // 导出Excel
  const handleExport = () => {
    const exportData = filteredRecords.map((record) => {
      const employee = employees.find(emp => emp.empNo === record.empNo)
      const item = items.find(itm => itm.itemCode === record.itemCode)
      return {
        '工号(*)': formatEmpNo(employee?.empNo) || '',
        '姓名(*)': employee?.name || '',
        岗位: employee?.position || '',
        '登记说明(*)': record.remarks || '',
        项目名称: item?.name || '',
        加减分: record.score,
        项目编号: record.itemCode,
        纸质编号: item?.paperCode || '',
        项目说明: item?.description || '',
        考核月份: record.month
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '绩效记录')
    XLSX.writeFile(wb, `绩效记录_${selectedMonth.format('YYYY-MM')}.xlsx`)
  }

  // 获取JSON输出数据
  const getJsonOutputData = () => {
    const monthStr = selectedMonth.format('YYYY-MM')
    // 只输出当前月份中itemCode为空或未定义的记录（未匹配的记录）
    const unmatchedRecords = records.filter(record =>
      record.month === monthStr && (!record.itemCode || record.itemCode.trim() === '')
    )

    return unmatchedRecords.map(record => ({
      id: record.id,
      remarks: record.remarks || ''
    }))
  }

  // 复制JSON到剪贴板
  const handleCopyJson = async () => {
    try {
      const jsonData = getJsonOutputData()
      const jsonString = JSON.stringify(jsonData, null, 2)
      await navigator.clipboard.writeText(jsonString)
      message.success('JSON数据已复制到剪贴板')
    } catch (error) {
      message.error('复制失败，请手动复制')
    }
  }

  // 粘贴JSON数据
  const handlePasteJson = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJsonInputText(text)
      message.success('数据已粘贴')
    } catch (error) {
      message.error('粘贴失败，请手动粘贴')
    }
  }

  // 导入JSON数据
  const handleImportJson = async () => {
    if (!jsonInputText.trim()) {
      message.warning('请输入JSON数据')
      return
    }

    try {
      const jsonData = JSON.parse(jsonInputText)

      if (!Array.isArray(jsonData)) {
        message.error('JSON格式错误：数据应为数组格式')
        return
      }

      // 验证数据格式
      for (const item of jsonData) {
        if (!item.id || typeof item.id !== 'number') {
          message.error('JSON格式错误：每个项目必须包含有效的id字段')
          return
        }
        if (item.itemCode !== undefined && typeof item.itemCode !== 'string') {
          message.error('JSON格式错误：itemCode字段必须为字符串')
          return
        }
        if (item.score !== undefined && typeof item.score !== 'number') {
          message.error('JSON格式错误：score字段必须为数字')
          return
        }
        if (item.name !== undefined && typeof item.name !== 'string') {
          message.error('JSON格式错误：name字段必须为字符串')
          return
        }
      }

      // 更新记录
      let updatedCount = 0
      const updatedRecords = records.map(record => {
        const matchItem = jsonData.find((item: any) => item.id === record.id)
        if (matchItem) {
          updatedCount++
          return {
            ...record,
            itemCode: matchItem.itemCode !== undefined ? matchItem.itemCode : record.itemCode,
            score: matchItem.score !== undefined ? matchItem.score : record.score
          }
        }
        return record
      })

      // 保存到数据库
      for (const record of updatedRecords) {
        if (record.id) {
          const matchItem = jsonData.find((item: any) => item.id === record.id)
          if (matchItem) {
            console.log(`JSON导入保存记录: id=${record.id}, itemCode=${matchItem.itemCode}, score=${matchItem.score}`)
            // 只更新匹配相关的字段，保留其他字段不变
            await api.put(`/records/${record.id}`, {
              itemCode: matchItem.itemCode !== undefined ? matchItem.itemCode : record.itemCode,
              score: matchItem.score !== undefined ? matchItem.score : record.score
            })
            console.log(`JSON导入记录 ${record.id} 保存成功`)
          }
        }
      }

      setRecords(updatedRecords)
      setJsonInputVisible(false)
      setJsonInputText('')
      console.log(`JSON导入完成，数据库已保存 ${updatedCount} 条记录`)
      message.success(`导入成功，更新了 ${updatedCount} 条记录`)

      // 重新加载数据以验证保存是否成功
      await loadRecords()
    } catch (error) {
      console.error('JSON导入错误:', error)
      message.error('JSON格式错误，请检查数据格式')
    }
  }



  // 计算统计数据
  const getStatistics = () => {
    const totalRecords = filteredRecords.length
    const avgScore = totalRecords > 0
      ? filteredRecords.reduce((sum, record) => sum + record.score, 0) / totalRecords
      : 0
    const uniqueEmployees = new Set(filteredRecords.map(record => record.empNo)).size
    const uniqueItems = new Set(filteredRecords.map(record => record.itemCode)).size

    return { totalRecords, avgScore, uniqueEmployees, uniqueItems }
  }

  const statistics = getStatistics()

  // 批量删除处理
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录')
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？此操作不可撤销。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map(id => api.delete(`/records/${id}`)))
          message.success(`成功删除 ${selectedRowKeys.length} 条记录`)
          setSelectedRowKeys([])
          loadRecords()
        } catch (error) {
          message.error('批量删除失败')
        }
      }
    })
  }

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        const allKeys = filteredRecords.map(record => record.id!)
        setSelectedRowKeys(allKeys)
      } else {
        setSelectedRowKeys([])
      }
    }
  }

  const columns: ColumnsType<Record> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => {
        return (pagination.current - 1) * pagination.pageSize + index + 1
      }
    },
    {
      title: '工号',
      dataIndex: 'empNo',
      key: 'empNo',
      width: 100,
      align: 'center',
      render: (text) => formatEmpNo(text)
    },
    {
      title: '姓名',
      dataIndex: 'empNo',
      key: 'empName',
      width: 100,
      render: (empNo: string) => {
        const employee = employees.find(emp => String(emp.empNo) === String(empNo))
        return employee?.name || '未知员工'
      }
    },
    {
      title: '岗位',
      dataIndex: 'empNo',
      key: 'position',
      width: 120,
      render: (empNo: string) => {
        const employee = employees.find(emp => String(emp.empNo) === String(empNo))
        return employee?.position || '未知岗位'
      }
    },
    {
      title: '登记说明',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 200,
      ellipsis: true
    },
    {
      title: '项目名称',
      dataIndex: 'itemCode',
      key: 'itemName',
      width: 200,
      ellipsis: true,
      render: (itemCode: string) => {
        const item = items.find(itm => itm.itemCode === itemCode)
        return item?.name || '未知项目'
      }
    },
    {
      title: '加减分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      align: 'center',
      render: (score: number) => {
        const color = score > 0 ? 'success' : 'error'
        return <Tag color={color}>{score}</Tag>
      }
    },
    {
      title: '项目编号',
      dataIndex: 'itemCode',
      key: 'itemCode',
      width: 120,
      align: 'center'
    },
    {
      title: '纸质编号',
      dataIndex: 'itemCode',
      key: 'paperCode',
      width: 120,
      align: 'center',
      render: (itemCode: string) => {
        const item = items.find(itm => itm.itemCode === itemCode)
        return item?.paperCode || '-'
      }
    },
    {
      title: '项目说明',
      dataIndex: 'itemCode',
      key: 'itemDescription',
      width: 200,
      ellipsis: true,
      render: (itemCode: string) => {
        const item = items.find(itm => itm.itemCode === itemCode)
        return item?.description || '-'
      }
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
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id!)}
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
      <Title level={2}>绩效登记</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总记录数" value={statistics.totalRecords} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均得分" value={statistics.avgScore} precision={2} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="涉及员工" value={statistics.uniqueEmployees} suffix="人" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="涉及条目" value={statistics.uniqueItems} suffix="项" />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              placeholder="选择月份"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择员工"
              allowClear
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) => {
                const employee = employees.find(emp => String(emp.empNo) === String(option?.value))
                if (!employee) return false
                const safeToString = (value: any): string => {
                  if (value === null || value === undefined) return ''
                  return String(value)
                }
                const searchText = input.toLowerCase()
                return safeToString(employee.name).toLowerCase().includes(searchText) ||
                  safeToString(employee.empNo).toLowerCase().includes(searchText) ||
                  formatEmpNo(employee.empNo).toLowerCase().includes(searchText)
              }}
            >
              {employees.map(emp => {
                const safeToString = (value: any): string => {
                  if (value === null || value === undefined) return ''
                  return String(value)
                }
                const displayText = `${safeToString(emp.name)}(${formatEmpNo(emp.empNo)})`
                return (
                  <Option key={emp.id} value={emp.empNo}>
                    {displayText}
                  </Option>
                )
              })}
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择条目"
              allowClear
              value={selectedItem}
              onChange={setSelectedItem}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) => {
                const item = items.find(itm => itm.itemCode === option?.value)
                if (!item) return false
                const safeToString = (value: any): string => {
                  if (value === null || value === undefined) return ''
                  return String(value)
                }
                const searchText = input.toLowerCase()
                return safeToString(item.name).toLowerCase().includes(searchText) ||
                  safeToString(item.itemCode).toLowerCase().includes(searchText) ||
                  safeToString(item.paperCode).toLowerCase().includes(searchText)
              }}
            >
              {items.map(item => {
                const safeToString = (value: any): string => {
                  if (value === null || value === undefined) return ''
                  return String(value)
                }
                return (
                  <Option key={item.id} value={item.itemCode}>
                    {safeToString(item.name)}
                  </Option>
                )
              })}
            </Select>
          </Col>
          <Col span={5}>
            <Search
              placeholder="搜索记录"
              allowClear
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col span={5} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增记录
              </Button>
              <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                下载模板
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 功能按钮 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24} style={{ textAlign: 'center' }}>
            <Space size="middle">
              <Button
                icon={<QuestionCircleOutlined />}
                onClick={() => setHelpVisible(true)}
              >
                使用说明
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshData}
                loading={refreshLoading}
              >
                刷新数据
              </Button>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleAutoMatch}
                loading={matchLoading}
              >
                开始匹配
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => setJsonOutputVisible(true)}
              >
                输出JSON
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={() => setJsonInputVisible(true)}
              >
                输入JSON
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

        {/* 操作按钮 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            {selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize: pageSize || 10 })
              setSelectedRowKeys([]) // 翻页时清空选择
            },
            onShowSizeChange: (_, size) => {
              setPagination({ current: 1, pageSize: size })
              setSelectedRowKeys([]) // 改变页面大小时清空选择
            }
          }}
        />
      </Card>

      <Modal
        title={
          <div>
            {editingRecord ? '编辑记录' : '新增记录'}
            {!editingRecord && (
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                (支持为多名员工批量添加相同的考核内容)
              </span>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setSelectedFormEmployee(null)
          setSelectedFormEmployees([])
          setSelectedFormItem(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              {!editingRecord ? (
                // 新增模式：多员工选择
                <Form.Item
                  name="empNos"
                  label="选择员工（可多选）"
                  rules={[{ required: true, message: '请至少选择一名员工' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="请选择员工（可多选）"
                    showSearch
                    onChange={handleMultiEmployeeSelect}
                    filterOption={(input, option) => {
                      const employee = employees.find(emp => String(emp.empNo) === String(option?.value))
                      if (!employee) return false
                      const safeToString = (value: any): string => {
                        if (value === null || value === undefined) return ''
                        return String(value)
                      }
                      const searchText = input.toLowerCase()
                      return safeToString(employee.name).toLowerCase().includes(searchText) ||
                        safeToString(employee.empNo).toLowerCase().includes(searchText) ||
                        formatEmpNo(employee.empNo).toLowerCase().includes(searchText) ||
                        safeToString(employee.position).toLowerCase().includes(searchText) ||
                        safeToString(employee.station).toLowerCase().includes(searchText)
                    }}
                  >
                    {employees.map(emp => (
                      <Option key={emp.empNo} value={emp.empNo}>
                        {emp.name}({formatEmpNo(emp.empNo)})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                // 编辑模式：单员工选择
                <Form.Item
                  name="empNo"
                  label="姓名"
                  rules={[{ required: true, message: '请选择员工' }]}
                >
                  <Select
                    placeholder="请输入或选择员工姓名"
                    showSearch
                    onChange={handleEmployeeSelect}
                    filterOption={(input, option) => {
                      const employee = employees.find(emp => String(emp.empNo) === String(option?.value))
                      if (!employee) return false
                      const safeToString = (value: any): string => {
                        if (value === null || value === undefined) return ''
                        return String(value)
                      }
                      const searchText = input.toLowerCase()
                      return safeToString(employee.name).toLowerCase().includes(searchText) ||
                        safeToString(employee.empNo).toLowerCase().includes(searchText) ||
                        formatEmpNo(employee.empNo).toLowerCase().includes(searchText) ||
                        safeToString(employee.position).toLowerCase().includes(searchText) ||
                        safeToString(employee.station).toLowerCase().includes(searchText)
                    }}
                  >
                    {employees.map(emp => (
                      <Option key={emp.empNo} value={emp.empNo}>
                        {emp.name}({formatEmpNo(emp.empNo)})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                name="itemCode"
                label="项目名称"
              >
                <Select
                  placeholder="请输入或选择项目名称"
                  showSearch
                  onChange={handleItemSelect}
                  filterOption={(input, option) => {
                    const item = items.find(itm => itm.itemCode === option?.value)
                    if (!item) return false
                    const safeToString = (value: any): string => {
                      if (value === null || value === undefined) return ''
                      return String(value)
                    }
                    const searchText = input.toLowerCase()
                    return safeToString(item.name).toLowerCase().includes(searchText) ||
                      safeToString(item.itemCode).toLowerCase().includes(searchText) ||
                      safeToString(item.paperCode).toLowerCase().includes(searchText) ||
                      safeToString(item.category).toLowerCase().includes(searchText) ||
                      safeToString(item.description).toLowerCase().includes(searchText)
                  }}
                >
                  {items.map(item => (
                    <Option key={item.itemCode} value={item.itemCode}>
                      {item.name}({item.itemCode})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 显示联动信息 */}
          {!editingRecord && selectedFormEmployees.length > 0 ? (
            // 新增模式：显示选中的多个员工
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label={`已选择员工 (${selectedFormEmployees.length}名)`}>
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: '#fafafa'
                  }}>
                    {selectedFormEmployees.map((emp, index) => (
                      <div key={emp.empNo} style={{
                        padding: '4px 8px',
                        marginBottom: '4px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          <strong>{emp.name}</strong> ({formatEmpNo(emp.empNo)})
                        </span>
                        <span style={{ color: '#666' }}>
                          {emp.position} - {emp.station}
                        </span>
                      </div>
                    ))}
                  </div>
                </Form.Item>
              </Col>
            </Row>
          ) : (
            // 编辑模式：显示单个员工信息
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="工号">
                  <Input value={formatEmpNo(selectedFormEmployee?.empNo) || ''} disabled />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="岗位">
                  <Input value={selectedFormEmployee?.position || ''} disabled />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="项目编号">
                  <Input value={selectedFormItem?.itemCode || ''} disabled />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="纸质编号">
                  <Input value={selectedFormItem?.paperCode || ''} disabled />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="项目说明">
                <TextArea value={selectedFormItem?.description || ''} disabled rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="remarks"
                label="登记说明"
              >
                <TextArea rows={3} placeholder="请输入登记说明" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="score"
                label="加减分"
              >
                <InputNumber
                  min={-100}
                  max={100}
                  step={0.1}
                  placeholder="请输入加减分"
                  style={{ width: '100%' }}
                  addonAfter={selectedFormItem ? `满分: ${selectedFormItem.score}` : '分'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="month"
            label="考核月份"
            rules={[{ required: true, message: '请输入考核月份' }]}
          >
            <Input placeholder="YYYY-MM" />
          </Form.Item>
        </Form>
      </Modal>

      {/* JSON输出模态框 */}
      <Modal
        title="输出JSON数据"
        open={jsonOutputVisible}
        onCancel={() => setJsonOutputVisible(false)}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyJson}>
            复制JSON
          </Button>,
          <Button key="close" onClick={() => setJsonOutputVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <p>当前月份：{selectedMonth.format('YYYY年MM月')}</p>
          <p>未匹配记录数量：{getJsonOutputData().length} 条</p>
          <p style={{ color: '#666', fontSize: '12px' }}>注：只输出项目编号为空的未匹配记录</p>
        </div>
        <Input.TextArea
          value={JSON.stringify(getJsonOutputData(), null, 2)}
          readOnly
          rows={20}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </Modal>

      {/* JSON输入模态框 */}
      <Modal
        title="输入JSON数据"
        open={jsonInputVisible}
        onCancel={() => {
          setJsonInputVisible(false)
          setJsonInputText('')
        }}
        footer={[
          <Button key="paste" icon={<CopyOutlined />} onClick={handlePasteJson}>
            粘贴
          </Button>,
          <Button key="import" type="primary" onClick={handleImportJson}>
            确认导入
          </Button>,
          <Button key="cancel" onClick={() => {
            setJsonInputVisible(false)
            setJsonInputText('')
          }}>
            取消
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <p>请粘贴AI模型处理后的JSON数据：</p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            格式：[&#123;"id":number,"itemCode":string,"score":number,"name":string&#125;]
          </p>
        </div>
        <Input.TextArea
          value={jsonInputText}
          onChange={(e) => setJsonInputText(e.target.value)}
          placeholder="请粘贴JSON数据..."
          rows={20}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </Modal>

      {/* 使用说明模态框 */}
      <Modal
        title="绩效匹配使用说明"
        open={helpVisible}
        onCancel={() => setHelpVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHelpVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ lineHeight: '1.8' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1890ff', marginBottom: '10px' }}>⚠️ 重要提醒</h4>
            <p style={{ background: '#fff7e6', padding: '12px', borderRadius: '6px', border: '1px solid #ffd591' }}>
              <strong>开始匹配功能限制：</strong>每天所有用户总共只能使用1-2次，因为Coze资源点有限。
              <br />
              <strong>推荐方式：</strong>使用手动AI匹配，效果更好且不受限制。
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1890ff', marginBottom: '10px' }}>📋 手动AI匹配操作流程</h4>
            <ol style={{ paddingLeft: '20px' }}>
              <li>登录 <strong>Kimi</strong> 或 <strong>Deepseek AI</strong> 网站</li>
              <li>上传知识库文件（绩效条目.xlsx 和 绩效匹配案例.xlsx）作为参考文件</li>
              <li>复制下方的固定提示词发送给AI（第一步总结：上传提示词和2份Excel）</li>
              <li>点击页面上的"输出JSON"按钮，复制输出的JSON数据</li>
              <li>将JSON数据粘贴发送给AI进行处理（第二步总结：复制json发给ai）</li>
              <li>AI会自动生成匹配结果的JSON格式数据</li>
              <li>复制AI生成的结果，点击"输入JSON"按钮粘贴导入（第三步总结：复制ai生成json，导入）</li>
              <li>完成绩效手动AI匹配</li>
            </ol>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1890ff', marginBottom: '10px' }}>📚 知识库下载</h4>
            <div style={{ background: '#f6ffed', padding: '12px', borderRadius: '6px', border: '1px solid #b7eb8f' }}>
              <p><strong>绩效条目：</strong></p>
              <a
                href="https://img.iduodou.com/images/docs/20250827/CBBD49F8-58E6-4CAE-B7FC-898219DA3D12.xlsx?attname=%E7%BB%A9%E6%95%88%E6%9D%A1%E7%9B%AE.xlsx"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff', textDecoration: 'underline' }}
              >
                点击下载绩效条目.xlsx
              </a>
              <br /><br />
              <p><strong>绩效匹配案例：</strong></p>
              <a
                href="https://img.iduodou.com/images/docs/20250827/ECAB5245-53C7-4CE5-AD2E-ABB422950B7C.xlsx?attname=%E7%BB%A9%E6%95%88%E5%8C%B9%E9%85%8D%E6%A1%88%E4%BE%8B.xlsx"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff', textDecoration: 'underline' }}
              >
                点击下载绩效匹配案例.xlsx
              </a>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#1890ff', marginBottom: '10px' }}>🤖 固定提示词</h4>
            <div style={{ background: '#f0f2f5', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                点击下方按钮可直接复制完整的固定提示词到剪贴板，然后粘贴发送给AI助手。
              </p>
            </div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={copyPromptToClipboard}
              block
            >
              复制固定提示词
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PerformanceEntry