# 后端API完整列表

## 认证模块 (/api/auth)
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新token
- `POST /auth/logout` - 退出登录  
- `POST /auth/change-password` - 修改密码
- `POST /auth/reset-password` - 重置密码（管理员）

## 用户模块 (/api/users)
- `GET /users/me` - 获取当前用户信息

## 员工管理 (/api/employees)
- `GET /employees` - 获取员工列表（自动权限过滤）
- `GET /employees/:empNo` - 获取员工详情
- `POST /employees` - 新增员工
- `PUT /employees/:empNo` - 更新员工信息
- `DELETE /employees/:empNo` - 删除员工

## 考核条目 (/api/items)
- `GET /items` - 获取条目列表（按中心过滤）
- `GET /items/:id` - 获取条目详情
- `POST /items` - 新增条目（中心管理员+）
- `PUT /items/:id` - 更新条目
- `DELETE /items/:id` - 删除条目

## 绩效记录 (/api/records)
- `GET /records` - 获取记录列表（权限过滤）
- `GET /records/:id` - 获取记录详情
- `POST /records` - 新增记录（区域管理员+）
- `PUT /records/:id` - 更新记录
- `DELETE /records/:id` - 删除记录

## 消息通知 (/api/notifications)
- `GET /notifications` - 获取消息列表
- `GET /notifications/unread-count` - 获取未读数量（轮询）
- `POST /notifications/:id/read` - 标记已读
- `POST /notifications/mark-all-read` - 全部已读

## 绩效申诉 (/api/appeals)
- `GET /appeals` - 获取申诉列表
- `GET /appeals/:id` - 获取申诉详情
- `POST /appeals` - 提交申诉
- `POST /appeals/:id/process` - 处理申诉（批准/驳回）
- `GET /appeals/:id/history` - 获取申诉历史
- `GET /appeals/settings/:year/:month` - 获取申诉配置
- `PUT /appeals/settings/:year/:month` - 设置申诉配置

## 管理员任命 (/api/roles)
- `GET /roles/employees` - 获取可任命的员工列表
- `POST /roles/appoint` - 任命管理员
- `POST /roles/revoke` - 撤销管理员权限

## 审计日志 (/api/audit-logs)
- `GET /audit-logs` - 获取审计日志（超级管理员）
- `GET /audit-logs/actions` - 获取操作类型列表

---

## API响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 分页响应
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 权限说明

| 角色 | 权限级别 | 说明 |
|------|---------|------|
| EMPLOYEE | 1 | 普通员工，查看权限 |
| AREA_ADMIN | 2 | 区域管理员，管理本区域 |
| WORKSHOP_ADMIN | 3 | 车间管理员，管理本车间 |
| CENTER_ADMIN | 4 | 中心管理员，管理本中心 |
| SUPER_ADMIN | 5 | 超级管理员，全局权限 |
