// 员工表
export interface Employee {
  id?: number
  empNo: string        // 工号
  name: string         // 姓名
  position: string     // 岗位
  station: string      // 车站
  area: string         // 区域
  workshop: string     // 车间
  center: string       // 中心
  company: string      // 公司
  createdAt?: Date
  updatedAt?: Date
}

// 考核条目表
export interface Item {
  id?: number
  company: string      // 公司
  department: string   // 部门/中心
  paperCode: string    // 纸质编号
  itemCode: string     // 项目编号
  name: string         // 项目名称
  category: string     // 项目分类
  score: number        // 项目分值
  description: string  // 项目说明
  status: string       // 项目状态 (启用/停用)
  groupName: string    // 分组名称
  createdAt?: Date
  updatedAt?: Date
}

// 考核记录表
export interface Record {
  id?: number
  empNo: string        // 工号
  itemCode: string     // 项目编号
  month: string        // 月份 (YYYY-MM格式)
  score: number        // 得分
  remarks: string      // 备注说明
  createdAt?: Date
  updatedAt?: Date
}

// Excel导入模板
export interface EmployeeImportTemplate {
  姓名: string
  工号: string
  岗位: string
  车站: string
  区域: string
  车间: string
  中心: string
  公司: string
}

export interface ItemImportTemplate {
  公司: string
  '部门/中心': string
  纸质编号: string
  项目编号: string
  项目名称: string
  项目分类: string
  项目分值: number
  项目说明: string
  项目状态: string
  分组名称: string
}

export interface RecordImportTemplate {
  '工号(*)': string          // 必填
  '姓名(*)': string
  岗位: string
  '登记说明(*)': string      // 必填
  项目名称: string
  加减分: number
  项目编号: string
  纸质编号: string
  项目说明: string
  考核月份: string
  // 支持动态属性访问
  [key: string]: any
}

// 导出格式
export interface WorkshopExportFormat {
  工号: string
  中心: string
  姓名: string
  岗位: string
  绩效加分: number
  扣减得分: number
  月度绩效考核结果: number
  考核内容: string
  车站: string
}

export interface SystemExportFormat {
  工号: string
  姓名: string
  项目编号: string
  项目名称: string
  项目分值: number
  项目说明: string
  得分: number
  备注说明: string
}

// Electron API 类型声明
export interface ElectronAPI {
  testDatabase: () => Promise<{ success: boolean; error?: string }>
  
  // Employee operations
  getEmployees: () => Promise<Employee[]>
  getEmployeeById: (id: number) => Promise<Employee | undefined>
  getEmployeeByEmpNo: (empNo: string) => Promise<Employee | undefined>
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<{ id: number }>
  updateEmployee: (id: number, employee: Partial<Employee>) => Promise<void>
  deleteEmployee: (id: number) => Promise<void>
  bulkAddEmployees: (employees: Omit<Employee, 'id'>[]) => Promise<{ id: number }[]>
  bulkDeleteEmployees: (ids: number[]) => Promise<void>
  getEmployeeCount: () => Promise<number>
  
  // Item operations
  getItems: () => Promise<Item[]>
  getItemById: (id: number) => Promise<Item | undefined>
  getItemByCode: (itemCode: string) => Promise<Item | undefined>
  getActiveItems: () => Promise<Item[]>
  addItem: (item: Omit<Item, 'id'>) => Promise<{ id: number }>
  updateItem: (id: number, item: Partial<Item>) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  bulkAddItems: (items: Omit<Item, 'id'>[]) => Promise<{ id: number }[]>
  bulkDeleteItems: (ids: number[]) => Promise<void>
  getItemCount: () => Promise<number>
  
  // Record operations
  getRecords: () => Promise<Record[]>
  getRecordById: (id: number) => Promise<Record | undefined>
  getRecordsByEmployee: (empNo: string) => Promise<Record[]>
  getRecordsByPeriod: (month: string) => Promise<Record[]>
  getRecordsByEmployeeAndPeriod: (empNo: string, month: string) => Promise<Record[]>
  addRecord: (record: Omit<Record, 'id'>) => Promise<{ id: number }>
  updateRecord: (id: number, record: Partial<Record>) => Promise<void>
  deleteRecord: (id: number) => Promise<void>
  bulkAddRecords: (records: Omit<Record, 'id'>[]) => Promise<{ id: number }[]>
  bulkDeleteRecords: (ids: number[]) => Promise<void>
  getRecordCount: () => Promise<number>
  
  // Utility operations
  clearAllData: () => Promise<void>
  restartApp: () => void
  
  // Configuration management
  getConfig: () => Promise<{ success: boolean; data?: any; error?: string }>
  saveConfig: (config: any) => Promise<{ success: boolean; message?: string; error?: string }>
}

// 全局类型声明
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}