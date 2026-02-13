const Database = require('better-sqlite3')
const path = require('path')
const electron = require('electron')
const fs = require('fs')

const { app } = electron

class DatabaseManager {
  constructor() {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'performance.db')
    
    // 确保数据目录存在
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    
    this.db = new Database(dbPath)
    this.initTables()
  }

  initTables() {
    console.log('开始初始化数据库表...')
    
    // 检查表是否已存在
    const checkTable = (tableName) => {
      try {
        const result = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).get()
        return result !== undefined
      } catch (error) {
        return false
      }
    }

    // 只在表不存在时创建表
    if (!checkTable('employees')) {
      // 创建员工表
      this.db.exec(`
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empNo TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          position TEXT,
          station TEXT,
          area TEXT,
          workshop TEXT,
          center TEXT,
          company TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('已创建employees表')
    } else {
      console.log('employees表已存在，跳过创建')
    }

    if (!checkTable('items')) {
      // 创建绩效项目表
      this.db.exec(`
        CREATE TABLE items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          paperCode TEXT,
          itemCode TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          score REAL,
          description TEXT,
          status TEXT DEFAULT '启用',
          groupName TEXT,
          company TEXT,
          department TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('已创建items表')
    } else {
      console.log('items表已存在，跳过创建')
    }

    if (!checkTable('records')) {
      // 创建绩效记录表
      this.db.exec(`
        CREATE TABLE records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empNo TEXT NOT NULL,
          itemCode TEXT,
          month TEXT NOT NULL,
          score REAL,
          remarks TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('已创建records表')
    } else {
      console.log('records表已存在，跳过创建')
    }

    // 创建索引（如果不存在）
    try {
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_employees_empNo ON employees(empNo);
        CREATE INDEX IF NOT EXISTS idx_items_itemCode ON items(itemCode);
        CREATE INDEX IF NOT EXISTS idx_records_empNo ON records(empNo);
        CREATE INDEX IF NOT EXISTS idx_records_itemCode ON records(itemCode);
        CREATE INDEX IF NOT EXISTS idx_records_month ON records(month);
      `)
      console.log('已创建/检查索引')
    } catch (error) {
      console.log('创建索引时出错:', error.message)
    }
    
    console.log('数据库表初始化完成')
  }

  // 员工操作
  getEmployees() {
    return this.db.prepare('SELECT * FROM employees ORDER BY createdAt DESC').all()
  }

  addEmployee(employee) {
    const stmt = this.db.prepare(`
      INSERT INTO employees (empNo, name, position, station, area, workshop, center, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      employee.empNo, employee.name, employee.position, employee.station,
      employee.area, employee.workshop, employee.center, employee.company
    )
  }

  updateEmployee(id, employee) {
    const stmt = this.db.prepare(`
      UPDATE employees 
      SET empNo = ?, name = ?, position = ?, station = ?, area = ?, workshop = ?, center = ?, company = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(
      employee.empNo, employee.name, employee.position, employee.station,
      employee.area, employee.workshop, employee.center, employee.company, id
    )
  }

  deleteEmployee(id) {
    return this.db.prepare('DELETE FROM employees WHERE id = ?').run(id)
  }

  // 绩效项目操作
  getItems() {
    return this.db.prepare('SELECT * FROM items ORDER BY createdAt DESC').all()
  }

  addItem(item) {
    const stmt = this.db.prepare(`
      INSERT INTO items (paperCode, itemCode, name, category, score, description, status, groupName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      item.paperCode, item.itemCode, item.name, item.category,
      item.score, item.description, item.status, item.groupName
    )
  }

  updateItem(id, item) {
    const stmt = this.db.prepare(`
      UPDATE items 
      SET paperCode = ?, itemCode = ?, name = ?, category = ?, score = ?, description = ?, status = ?, groupName = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(
      item.paperCode, item.itemCode, item.name, item.category,
      item.score, item.description, item.status, item.groupName, id
    )
  }

  deleteItem(id) {
    return this.db.prepare('DELETE FROM items WHERE id = ?').run(id)
  }

  // 绩效记录操作
  getRecords() {
    return this.db.prepare(`
      SELECT r.*, e.name as employeeName, i.name as itemName
      FROM records r
      LEFT JOIN employees e ON r.empNo = e.empNo
      LEFT JOIN items i ON r.itemCode = i.itemCode
      ORDER BY r.createdAt DESC
    `).all()
  }

  addRecord(record) {
    const stmt = this.db.prepare(`
      INSERT INTO records (empNo, itemCode, month, score, remarks)
      VALUES (?, ?, ?, ?, ?)
    `)
    return stmt.run(record.empNo, record.itemCode, record.month, record.score, record.remarks)
  }

  updateRecord(id, record) {
    // 首先获取现有记录
    const existing = this.db.prepare('SELECT * FROM records WHERE id = ?').get(id)
    if (!existing) {
      throw new Error(`记录不存在: id=${id}`)
    }
    
    // 合并更新字段，保留现有字段的值
    const updatedRecord = {
      empNo: record.empNo !== undefined ? record.empNo : existing.empNo,
      itemCode: record.itemCode !== undefined ? record.itemCode : existing.itemCode,
      month: record.month !== undefined ? record.month : existing.month,
      score: record.score !== undefined ? record.score : existing.score,
      remarks: record.remarks !== undefined ? record.remarks : existing.remarks
    }
    
    const stmt = this.db.prepare(`
      UPDATE records 
      SET empNo = ?, itemCode = ?, month = ?, score = ?, remarks = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(
      updatedRecord.empNo, 
      updatedRecord.itemCode, 
      updatedRecord.month, 
      updatedRecord.score, 
      updatedRecord.remarks, 
      id
    )
  }

  deleteRecord(id) {
    return this.db.prepare('DELETE FROM records WHERE id = ?').run(id)
  }

  // 批量操作方法
  bulkAddEmployees(employees) {
    const stmt = this.db.prepare(`
      INSERT INTO employees (empNo, name, position, station, area, workshop, center, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((employees) => {
      const results = []
      for (const employee of employees) {
        try {
          const result = stmt.run(
            employee.empNo, employee.name, employee.position, employee.station,
            employee.area, employee.workshop, employee.center, employee.company
          )
          results.push({ success: true, id: result.lastInsertRowid, empNo: employee.empNo })
        } catch (error) {
          results.push({ success: false, empNo: employee.empNo, error: error.message })
        }
      }
      return results
    })
    
    return transaction(employees)
  }

  bulkAddItems(items) {
    const stmt = this.db.prepare(`
      INSERT INTO items (paperCode, itemCode, name, category, score, description, status, groupName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((items) => {
      const results = []
      for (const item of items) {
        try {
          const result = stmt.run(
            item.paperCode, item.itemCode, item.name, item.category,
            item.score, item.description, item.status, item.groupName
          )
          results.push({ success: true, id: result.lastInsertRowid, itemCode: item.itemCode })
        } catch (error) {
          results.push({ success: false, itemCode: item.itemCode, error: error.message })
        }
      }
      return results
    })
    
    return transaction(items)
  }

  bulkAddRecords(records) {
    const stmt = this.db.prepare(`
      INSERT INTO records (empNo, itemCode, month, score, remarks)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((records) => {
      const results = []
      for (const record of records) {
        try {
          const result = stmt.run(
            record.empNo, record.itemCode, record.month, record.score, record.remarks
          )
          results.push({ success: true, id: result.lastInsertRowid, empNo: record.empNo, itemCode: record.itemCode })
        } catch (error) {
          results.push({ success: false, empNo: record.empNo, itemCode: record.itemCode, error: error.message })
        }
      }
      return results
    })
    
    return transaction(records)
  }

  // 数据迁移
  migrateFromIndexedDB(data) {
    const transaction = this.db.transaction(() => {
      // 清空现有数据
      this.db.prepare('DELETE FROM records').run()
      this.db.prepare('DELETE FROM items').run()
      this.db.prepare('DELETE FROM employees').run()

      // 迁移员工数据
      if (data.employees) {
        const stmt = this.db.prepare(`
          INSERT INTO employees (empNo, name, position, station, area, workshop, center, company, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        data.employees.forEach(emp => {
          stmt.run(
            emp.empNo, emp.name, emp.position, emp.station,
            emp.area, emp.workshop, emp.center, emp.company,
            emp.createdAt || new Date().toISOString(),
            emp.updatedAt || new Date().toISOString()
          )
        })
      }

      // 迁移绩效项目数据
      if (data.items) {
        const stmt = this.db.prepare(`
          INSERT INTO items (paperCode, itemCode, name, category, score, description, status, groupName, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        data.items.forEach(item => {
          stmt.run(
            item.paperCode, item.itemCode, item.name, item.category,
            item.score, item.description, item.status, item.groupName,
            item.createdAt || new Date().toISOString(),
            item.updatedAt || new Date().toISOString()
          )
        })
      }

      // 迁移绩效记录数据
      if (data.records) {
        const stmt = this.db.prepare(`
          INSERT INTO records (empNo, itemCode, month, score, remarks, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        data.records.forEach(record => {
          stmt.run(
            record.empNo, record.itemCode, record.month, record.score, record.remarks,
            record.createdAt || new Date().toISOString(),
            record.updatedAt || new Date().toISOString()
          )
        })
      }
    })

    transaction()
    return { success: true, message: '数据迁移完成' }
  }

  // 数据备份
  backupDatabase() {
    const userDataPath = app.getPath('userData')
    const backupPath = path.join(userDataPath, 'backups')
    
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupPath, `performance_backup_${timestamp}.db`)
    
    fs.copyFileSync(path.join(userDataPath, 'performance.db'), backupFile)
    return backupFile
  }

  close() {
    this.db.close()
  }
}

module.exports = DatabaseManager