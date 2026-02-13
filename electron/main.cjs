const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./database.cjs');
let dbManager;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // 开发环境加载本地服务器，生产环境加载打包后的文件
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // 检查数据库文件状态
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'performance.db');
  console.log('数据库路径:', dbPath);
  
  // 只在开发环境且数据库文件被锁定时才尝试删除
  if (process.env.NODE_ENV === 'development' && fs.existsSync(dbPath)) {
    try {
      // 检查文件是否被锁定
      const stats = fs.statSync(dbPath);
      console.log('数据库文件已存在，大小:', stats.size, '字节');
      // 不再强制删除数据库文件
    } catch (error) {
      console.error('检查数据库文件失败:', error);
    }
  } else if (!fs.existsSync(dbPath)) {
    console.log('数据库文件不存在，将创建新文件');
  }
  
  dbManager = new DatabaseManager();
  console.log('DatabaseManager已初始化');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) {
      dbManager.close();
    }
    app.quit();
  }
});

// IPC 处理程序

// 员工管理
ipcMain.handle('get-employees', () => {
  return dbManager.getEmployees();
});

ipcMain.handle('add-employee', (event, employee) => {
  const result = dbManager.addEmployee(employee);
  return { id: result.lastInsertRowid, ...employee };
});

ipcMain.handle('update-employee', (event, employee) => {
  dbManager.updateEmployee(employee.id, employee);
  return employee;
});

ipcMain.handle('delete-employee', (event, id) => {
  dbManager.deleteEmployee(id);
  return { success: true };
});

// 绩效项目管理
ipcMain.handle('get-items', () => {
  return dbManager.getItems();
});

ipcMain.handle('add-item', (event, item) => {
  const result = dbManager.addItem(item);
  return { id: result.lastInsertRowid, ...item };
});

ipcMain.handle('update-item', (event, item) => {
  dbManager.updateItem(item.id, item);
  return item;
});

ipcMain.handle('delete-item', (event, id) => {
  dbManager.deleteItem(id);
  return { success: true };
});

// 绩效记录管理
ipcMain.handle('get-records', () => {
  return dbManager.getRecords();
});

ipcMain.handle('add-record', (event, record) => {
  const result = dbManager.addRecord(record);
  return { id: result.lastInsertRowid, ...record };
});

ipcMain.handle('update-record', (event, id, record) => {
  dbManager.updateRecord(id, record);
  return record;
});

ipcMain.handle('delete-record', (event, id) => {
  dbManager.deleteRecord(id);
  return { success: true };
});

// 批量操作
ipcMain.handle('bulk-add-employees', (event, employees) => {
  try {
    const results = dbManager.bulkAddEmployees(employees);
    // 返回符合类型定义的格式：{ id: number }[]
    const successResults = results.filter(r => r.success).map(r => ({ id: r.id }));
    const failureResults = results.filter(r => !r.success);
    
    if (failureResults.length > 0) {
      // 如果有失败的记录，返回错误信息
      const errorMessage = failureResults.map(r => `工号${r.empNo}: ${r.error}`).join('; ');
      throw new Error(`部分员工导入失败: ${errorMessage}`);
    }
    
    return successResults;
  } catch (error) {
    console.error('批量添加员工失败:', error);
    throw error;
  }
});

ipcMain.handle('bulk-add-items', (event, items) => {
  try {
    const results = dbManager.bulkAddItems(items);
    const successResults = results.filter(r => r.success).map(r => ({ id: r.id }));
    const failureResults = results.filter(r => !r.success);
    
    if (failureResults.length > 0) {
      const errorMessage = failureResults.map(r => `项目编号${r.itemCode}: ${r.error}`).join('; ');
      throw new Error(`部分条目导入失败: ${errorMessage}`);
    }
    
    return successResults;
  } catch (error) {
    console.error('批量添加条目失败:', error);
    throw error;
  }
});

ipcMain.handle('bulk-add-records', (event, records) => {
  try {
    const results = dbManager.bulkAddRecords(records);
    const successResults = results.filter(r => r.success).map(r => ({ id: r.id }));
    const failureResults = results.filter(r => !r.success);
    
    if (failureResults.length > 0) {
      const errorMessage = failureResults.map(r => `工号${r.empNo}-项目${r.itemCode}: ${r.error}`).join('; ');
      throw new Error(`部分记录导入失败: ${errorMessage}`);
    }
    
    return successResults;
  } catch (error) {
    console.error('批量添加记录失败:', error);
    throw error;
  }
});

// 批量删除操作
ipcMain.handle('bulk-delete-employees', (event, ids) => {
  try {
    for (const id of ids) {
      dbManager.deleteEmployee(id);
    }
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('批量删除员工失败:', error);
    throw error;
  }
});

ipcMain.handle('bulk-delete-items', (event, ids) => {
  try {
    for (const id of ids) {
      dbManager.deleteItem(id);
    }
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('批量删除条目失败:', error);
    throw error;
  }
});

ipcMain.handle('bulk-delete-records', (event, ids) => {
  try {
    for (const id of ids) {
      dbManager.deleteRecord(id);
    }
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('批量删除记录失败:', error);
    throw error;
  }
});

// 数据导出
ipcMain.handle('export-employees', () => {
  return dbManager.getEmployees();
});

ipcMain.handle('export-items', () => {
  return dbManager.getItems();
});

ipcMain.handle('export-records', () => {
  return dbManager.getRecords();
});

ipcMain.handle('export-data', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出数据',
    defaultPath: 'performance_data.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    const employees = dbManager.getEmployees();
    const items = dbManager.getItems();
    const records = dbManager.getRecords();
    
    const data = {
      employees,
      items,
      records,
      exportTime: new Date().toISOString()
    };
    
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return { success: true, filePath: result.filePath };
  }
  
  return { success: false };
});

// 数据导入
ipcMain.handle('import-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入数据',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      
      // 清空现有数据
      dbManager.db.exec('DELETE FROM records; DELETE FROM items; DELETE FROM employees;');
      
      // 导入数据
      if (data.employees) {
        const stmt = dbManager.db.prepare('INSERT INTO employees (empNo, name, position, station, area, workshop, center, company) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        data.employees.forEach(emp => {
          stmt.run(emp.empNo || '', emp.name, emp.position || '', emp.station || '', emp.area || '', emp.workshop || '', emp.center || '', emp.company || '');
        });
      }
      
      if (data.items) {
        const stmt = dbManager.db.prepare('INSERT INTO items (name, description, score) VALUES (?, ?, ?)');
        data.items.forEach(item => {
          stmt.run(item.name, item.description, item.score);
        });
      }
      
      if (data.records) {
        const stmt = dbManager.db.prepare('INSERT INTO records (employee_id, item_id, score, remarks) VALUES (?, ?, ?, ?)');
        data.records.forEach(record => {
          stmt.run(record.employee_id, record.item_id, record.score, record.remarks);
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false };
});

// 配置管理
ipcMain.handle('get-config', async () => {
  try {
    // 在桌面应用中，配置文件保存在用户数据目录
    const userDataPath = app.getPath('userData');
    const envPath = path.join(userDataPath, 'config.env');
    
    console.log('配置文件路径:', envPath);
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const config = {};
      
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      console.log('读取到的配置:', Object.keys(config));
      
      return {
        success: true,
        data: config
      };
    } else {
      console.log('配置文件不存在，将使用默认配置');
      return {
        success: false,
        error: '配置文件不存在'
      };
    }
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return {
      success: false,
      error: `读取配置文件失败: ${error.message}`
    };
  }
});

ipcMain.handle('save-config', async (event, configData) => {
  try {
    // 在桌面应用中，配置文件保存在用户数据目录
    const userDataPath = app.getPath('userData');
    const envPath = path.join(userDataPath, 'config.env');
    
    console.log('保存配置到:', envPath);
    console.log('配置数据:', configData);
    
    const envContent = `# Coze API 配置
VITE_COZE_API_KEY=${configData.VITE_COZE_API_KEY || ''}
VITE_COZE_WORKFLOW_ID=${configData.VITE_COZE_WORKFLOW_ID || ''}
VITE_COZE_API_URL=${configData.VITE_COZE_API_URL || 'https://api.coze.cn/v1/workflow/stream_run'}

# 注意：
# 1. 这个文件包含敏感信息，请妥善保管
# 2. 修改配置后需要重启应用才能生效
# 3. 配置文件位置：${envPath}
`;
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('配置保存成功');
    
    return {
      success: true,
      message: '配置保存成功，请重启应用使配置生效'
    };
  } catch (error) {
    console.error('写入配置文件失败:', error);
    return {
      success: false,
      error: `写入配置文件失败: ${error.message}`
    };
  }
});