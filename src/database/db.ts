import Dexie, { Table } from 'dexie'
import { Employee, Item, Record } from '../types'

export class PerformanceDB extends Dexie {
  employees!: Table<Employee>
  items!: Table<Item>
  records!: Table<Record>

  constructor() {
    super('PerformanceDB')
    this.version(1).stores({
      employees: '++id, empNo, name, position, station, area, workshop, center, company, createdAt, updatedAt',
      items: '++id, paperCode, itemCode, name, category, score, description, status, groupName, createdAt, updatedAt',
      records: '++id, empNo, itemCode, month, score, remarks, createdAt, updatedAt'
    })

    // 版本2：为工号字段添加唯一索引约束
    this.version(2).stores({
      employees: '++id, &empNo, name, position, station, area, workshop, center, company, createdAt, updatedAt',
      items: '++id, paperCode, itemCode, name, category, score, description, status, groupName, createdAt, updatedAt',
      records: '++id, empNo, itemCode, month, score, remarks, createdAt, updatedAt'
    })

    // 添加钩子函数自动设置创建和更新时间
    this.employees.hook('creating', function (_primKey, obj, _trans) {
      obj.createdAt = new Date()
      obj.updatedAt = new Date()
    })

    this.employees.hook('updating', function (modifications, _primKey, _obj, _trans) {
      (modifications as any).updatedAt = new Date()
    })

    this.items.hook('creating', function (_primKey, obj, _trans) {
      obj.createdAt = new Date()
      obj.updatedAt = new Date()
    })

    this.items.hook('updating', function (modifications, _primKey, _obj, _trans) {
      (modifications as any).updatedAt = new Date()
    })

    this.records.hook('creating', function (_primKey, obj, _trans) {
      obj.createdAt = new Date()
      obj.updatedAt = new Date()
    })

    this.records.hook('updating', function (modifications, _primKey, _obj, _trans) {
      (modifications as any).updatedAt = new Date()
    })
  }
}

export const db = new PerformanceDB()