import React from 'react'
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Avatar, Dropdown, Badge } from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
  ExportOutlined,
  BellOutlined,
  LogoutOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CrownOutlined,
  AuditOutlined
} from '@ant-design/icons'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import EmployeeManagement from './pages/EmployeeManagement'
import ItemManagement from './pages/ItemManagement'
import PerformanceEntry from './pages/PerformanceEntry'
import ExportPage from './pages/ExportPage'
import MyPerformance from './pages/MyPerformance'
import AppealManagement from './pages/AppealManagement'
import NotificationCenter from './pages/NotificationCenter'
import RoleManagement from './pages/RoleManagement'
import AuditLogs from './pages/AuditLogs'
import {
  getRoleName,
  canManageEmployees,
  canManageItems,
  canManageRoles,
  canViewAuditLogs
} from './utils/permissions'

const { Header, Content, Sider } = Layout

const AppContent: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 根据用户角色过滤菜单
  const menuItems = [
    {
      key: '/my-performance',
      icon: <TrophyOutlined />,
      label: '我的绩效',
      visible: !!user
    },
    {
      key: '/',
      icon: <UserOutlined />,
      label: '员工管理',
      visible: user && canManageEmployees(user.role)
    },
    {
      key: '/items',
      icon: <SettingOutlined />,
      label: '绩效管理办法',
      visible: user && canManageItems(user.role)
    },
    {
      key: '/entry',
      icon: <FileTextOutlined />,
      label: '绩效登记',
      visible: user && canManageEmployees(user.role)
    },
    {
      key: '/export',
      icon: <ExportOutlined />,
      label: '导出',
      visible: !!user
    },
    {
      key: '/appeals',
      icon: <ExclamationCircleOutlined />,
      label: '申诉管理',
      visible: !!user
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知',
      visible: !!user
    },
    {
      key: '/roles',
      icon: <CrownOutlined />,
      label: '角色管理',
      visible: user && canManageRoles(user.role)
    },
    {
      key: '/audit-logs',
      icon: <AuditOutlined />,
      label: '审计日志',
      visible: user && canViewAuditLogs(user.role)
    },
  ].filter(item => item.visible)

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: `${user?.name} - ${user ? getRoleName(user.role) : ''}`,
      disabled: true
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  if (!user) {
    return null
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="demo-logo-vertical" style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          绩效系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            绩效考核系统
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={0} showZero={false}>
              <BellOutlined
                style={{ fontSize: 20, cursor: 'pointer' }}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<EmployeeManagement />} />
              <Route path="/items" element={<ItemManagement />} />
              <Route path="/entry" element={<PerformanceEntry />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/my-performance" element={<MyPerformance />} />
              <Route path="/appeals" element={<AppealManagement />} />
              <Route path="/notifications" element={<NotificationCenter />} />
              <Route path="/roles" element={<RoleManagement />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppContent />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
