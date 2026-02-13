// Electron环境下的数据库操作接口
// 这个文件提供统一的数据访问层，自动检测环境并选择合适的数据库操作方式

import type { Employee, Item, Record } from '../types/index';
import { db } from './db';

// 检测是否在Electron环境中
const isElectronEnv = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// 类型守卫函数
function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('Electron API is not available');
  }
  return window.electronAPI;
}

// 简单的内存缓存
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟缓存

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// 统一的数据库操作类
class ElectronDB {
  private employeeCache = new SimpleCache<Employee[]>();
  private itemCache = new SimpleCache<Item[]>();
  private recordCache = new SimpleCache<Record[]>();

  // 员工相关操作
  async getAllEmployees(): Promise<Employee[]> {
    const cacheKey = 'all-employees';
    let cached = this.employeeCache.get(cacheKey);
    if (cached) return cached;

    let result: Employee[];
    if (isElectronEnv()) {
      result = await getElectronAPI().getEmployees();
    } else {
      result = await db.employees.toArray();
    }
    
    this.employeeCache.set(cacheKey, result);
    return result;
  }

  async getEmployeeById(id: number): Promise<Employee | undefined> {
    const employees = await this.getAllEmployees();
    return employees.find(emp => emp.id === id);
  }

  async addEmployee(employee: Omit<Employee, 'id'>): Promise<number> {
    let result: number;
    if (isElectronEnv()) {
      const response = await getElectronAPI().addEmployee(employee);
      result = response.id;
    } else {
      result = await db.employees.add(employee as Employee);
    }
    
    // 清除缓存
    this.employeeCache.invalidate('employee');
    return result;
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().updateEmployee(id, employee);
    } else {
      await db.employees.update(id, employee);
    }
    
    // 清除相关缓存
    this.employeeCache.invalidate('employee');
  }

  async deleteEmployee(id: number): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().deleteEmployee(id);
    } else {
      await db.employees.delete(id);
    }
    
    // 清除相关缓存
    this.employeeCache.invalidate('employee');
  }

  // 绩效项目相关操作
  async getAllItems(): Promise<Item[]> {
    const cacheKey = 'all-items';
    let cached = this.itemCache.get(cacheKey);
    if (cached) return cached;

    let result: Item[];
    if (isElectronEnv()) {
      result = await getElectronAPI().getItems();
    } else {
      result = await db.items.toArray();
    }
    
    this.itemCache.set(cacheKey, result);
    return result;
  }

  async getItemById(id: number): Promise<Item | undefined> {
    const items = await this.getAllItems();
    return items.find(item => item.id === id);
  }

  async addItem(item: Omit<Item, 'id'>): Promise<number> {
    let result: number;
    if (isElectronEnv()) {
      const response = await getElectronAPI().addItem(item);
      result = response.id;
    } else {
      result = await db.items.add(item as Item);
    }
    
    // 清除缓存
    this.itemCache.invalidate('item');
    return result;
  }

  async updateItem(id: number, item: Partial<Item>): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().updateItem(id, item);
    } else {
      await db.items.update(id, item);
    }
    
    // 清除相关缓存
    this.itemCache.invalidate('item');
  }

  async deleteItem(id: number): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().deleteItem(id);
    } else {
      await db.items.delete(id);
    }
    
    // 清除相关缓存
    this.itemCache.invalidate('item');
  }

  // 绩效记录相关操作
  async getAllRecords(): Promise<Record[]> {
    const cacheKey = 'all-records';
    let cached = this.recordCache.get(cacheKey);
    if (cached) return cached;

    let result: Record[];
    if (isElectronEnv()) {
      result = await getElectronAPI().getRecords();
    } else {
      result = await db.records.toArray();
    }
    
    this.recordCache.set(cacheKey, result);
    return result;
  }

  async getRecordById(id: number): Promise<Record | undefined> {
    const records = await this.getAllRecords();
    return records.find(record => record.id === id);
  }

  // 优化：使用缓存数据进行筛选，避免重复查询
  async getRecordsByEmployee(empNo: string): Promise<Record[]> {
    const records = await this.getAllRecords();
    return records.filter(record => record.empNo === empNo);
  }

  async getRecordsByPeriod(month: string): Promise<Record[]> {
    const records = await this.getAllRecords();
    return records.filter(record => record.month === month);
  }

  async getRecordsByEmployeeAndPeriod(empNo: string, month: string): Promise<Record[]> {
    const records = await this.getAllRecords();
    return records.filter(record => record.empNo === empNo && record.month === month);
  }

  async addRecord(record: Omit<Record, 'id'>): Promise<number> {
    let result: number;
    if (isElectronEnv()) {
      const response = await getElectronAPI().addRecord(record);
      result = response.id;
    } else {
      result = await db.records.add(record as Record);
    }
    
    // 清除缓存
    this.recordCache.invalidate('record');
    return result;
  }

  async updateRecord(id: number, record: Partial<Record>): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().updateRecord(id, record);
    } else {
      await db.records.update(id, record);
    }
    
    // 清除相关缓存
    this.recordCache.invalidate('record');
  }

  async deleteRecord(id: number): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().deleteRecord(id);
    } else {
      await db.records.delete(id);
    }
    
    // 清除相关缓存
    this.recordCache.invalidate('record');
  }

  async bulkDeleteEmployees(ids: string[]): Promise<void> {
    // 验证并转换ID为有效的数字
    const validIds = ids
      .map(id => parseInt(String(id)))
      .filter(id => !isNaN(id) && id > 0);
    
    if (validIds.length === 0) {
      throw new Error('没有有效的ID可供删除');
    }
    
    if (isElectronEnv()) {
      await getElectronAPI().bulkDeleteEmployees(validIds);
    } else {
      await db.employees.bulkDelete(validIds);
    }
    
    // 清除缓存
    this.employeeCache.clear();
  }

  async bulkDeleteItems(ids: string[]): Promise<void> {
    // 验证并转换ID为有效的数字
    const validIds = ids
      .map(id => parseInt(String(id)))
      .filter(id => !isNaN(id) && id > 0);
    
    if (validIds.length === 0) {
      throw new Error('没有有效的ID可供删除');
    }
    
    if (isElectronEnv()) {
      await getElectronAPI().bulkDeleteItems(validIds);
    } else {
      await db.items.bulkDelete(validIds);
    }
    
    // 清除缓存
    this.itemCache.clear();
  }

  async bulkDeleteRecords(ids: string[]): Promise<void> {
    // 验证并转换ID为有效的数字
    const validIds = ids
      .map(id => parseInt(String(id)))
      .filter(id => !isNaN(id) && id > 0);
    
    if (validIds.length === 0) {
      throw new Error('没有有效的ID可供删除');
    }
    
    if (isElectronEnv()) {
      await getElectronAPI().bulkDeleteRecords(validIds);
    } else {
      await db.records.bulkDelete(validIds);
    }
    
    // 清除缓存
    this.recordCache.clear();
  }

  // 批量操作
  async bulkAddEmployees(employees: Omit<Employee, 'id'>[]): Promise<number[]> {
    let result: number[];
    if (isElectronEnv()) {
      const results = await getElectronAPI().bulkAddEmployees(employees);
      result = results.map((r: { id: number }) => r.id);
    } else {
      result = await db.employees.bulkAdd(employees as Employee[], { allKeys: true });
    }
    
    // 清除缓存
    this.employeeCache.clear();
    return result;
  }

  async bulkAddItems(items: Omit<Item, 'id'>[]): Promise<number[]> {
    let result: number[];
    if (isElectronEnv()) {
      const results = await getElectronAPI().bulkAddItems(items);
      result = results.map((r: { id: number }) => r.id);
    } else {
      result = await db.items.bulkAdd(items as Item[], { allKeys: true });
    }
    
    // 清除缓存
    this.itemCache.clear();
    return result;
  }

  async bulkAddRecords(records: Omit<Record, 'id'>[]): Promise<number[]> {
    let result: number[];
    if (isElectronEnv()) {
      const results = await getElectronAPI().bulkAddRecords(records);
      result = results.map((r: { id: number }) => r.id);
    } else {
      result = await db.records.bulkAdd(records as Record[], { allKeys: true });
    }
    
    // 清除缓存
    this.recordCache.clear();
    return result;
  }

  // 统计相关操作 - 使用缓存优化
  async getEmployeeCount(): Promise<number> {
    const employees = await this.getAllEmployees();
    return employees.length;
  }

  async getItemCount(): Promise<number> {
    const items = await this.getAllItems();
    return items.length;
  }

  async getRecordCount(): Promise<number> {
    const records = await this.getAllRecords();
    return records.length;
  }

  // 数据清理操作
  async clearAllData(): Promise<void> {
    if (isElectronEnv()) {
      await getElectronAPI().clearAllData();
    } else {
      await db.transaction('rw', db.employees, db.items, db.records, async () => {
        await db.employees.clear();
        await db.items.clear();
        await db.records.clear();
      });
    }
    
    // 清除所有缓存
    this.employeeCache.clear();
    this.itemCache.clear();
    this.recordCache.clear();
  }

  // 环境检测方法
  isUsingElectronDB(): boolean {
    return isElectronEnv();
  }

  isUsingIndexedDB(): boolean {
    return !isElectronEnv();
  }

  getCurrentDBType(): 'SQLite' | 'IndexedDB' {
    return this.isUsingElectronDB() ? 'SQLite' : 'IndexedDB';
  }

  // 便捷方法，为了向后兼容
  async getEmployees(): Promise<Employee[]> {
    return this.getAllEmployees();
  }

  async getItems(): Promise<Item[]> {
    return this.getAllItems();
  }

  async getActiveItems(): Promise<Item[]> {
    const items = await this.getAllItems();
    return items.filter((item: Item) => item.status === '启用');
  }

  async getRecords(): Promise<Record[]> {
    return this.getAllRecords();
  }

  // 新增：清除缓存的公共方法
  clearCache(): void {
    this.employeeCache.clear();
    this.itemCache.clear();
    this.recordCache.clear();
  }
}

// 导出统一的数据库实例
export const electronDB = new ElectronDB();

// 为了向后兼容，也导出类型
export type { Employee, Item, Record };

// 导出环境检测函数
export { isElectronEnv };