const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 员工管理
  getEmployees: () => ipcRenderer.invoke('get-employees'),
  addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
  updateEmployee: (id, employee) => ipcRenderer.invoke('update-employee', id, employee),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),
  
  // 绩效项目管理
  getItems: () => ipcRenderer.invoke('get-items'),
  addItem: (item) => ipcRenderer.invoke('add-item', item),
  updateItem: (id, item) => ipcRenderer.invoke('update-item', id, item),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  
  // 绩效记录管理
  getRecords: () => ipcRenderer.invoke('get-records'),
  addRecord: (record) => ipcRenderer.invoke('add-record', record),
  updateRecord: (id, record) => ipcRenderer.invoke('update-record', id, record),
  deleteRecord: (id) => ipcRenderer.invoke('delete-record', id),
  
  // 批量操作
  bulkAddEmployees: (employees) => ipcRenderer.invoke('bulk-add-employees', employees),
  bulkAddItems: (items) => ipcRenderer.invoke('bulk-add-items', items),
  bulkAddRecords: (records) => ipcRenderer.invoke('bulk-add-records', records),
  bulkDeleteEmployees: (ids) => ipcRenderer.invoke('bulk-delete-employees', ids),
  bulkDeleteItems: (ids) => ipcRenderer.invoke('bulk-delete-items', ids),
  bulkDeleteRecords: (ids) => ipcRenderer.invoke('bulk-delete-records', ids),
  
  // 数据迁移和备份
  migrateData: (data) => ipcRenderer.invoke('migrate-data', data),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (configData) => ipcRenderer.invoke('save-config', configData),
  
  // 平台检测
  isElectron: true,
  platform: process.platform
});