import { useState, useMemo } from 'react'
import { Layout, Menu, Dropdown, Avatar, Space, Typography, theme } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RocketOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'
import type { UserRole } from '@/types'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

const roleMenuMap: Record<UserRole, string[]> = {
  OPERATOR: ['flight', 'waybill', 'uld'],
  INSPECTOR: ['flight', 'waybill', 'security'],
  REVIEWER: ['flight', 'uld', 'review'],
  SUPERVISOR: ['flight', 'waybill', 'uld', 'security', 'review']
}

const allMenus: MenuItem[] = [
  { key: 'flight', icon: <RocketOutlined />, label: '航班管理', path: '/flight' },
  { key: 'waybill', icon: <FileTextOutlined />, label: '货邮单管理', path: '/waybill' },
  { key: 'uld', icon: <InboxOutlined />, label: '板箱管理', path: '/uld' },
  { key: 'security', icon: <SafetyCertificateOutlined />, label: '安检确认', path: '/waybill/security' },
  { key: 'review', icon: <AuditOutlined />, label: '复核管理', path: '/review' }
]

const roleNameMap: Record<UserRole, string> = {
  OPERATOR: '操作员',
  INSPECTOR: '安检员',
  REVIEWER: '复核员',
  SUPERVISOR: '主管'
}

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useUserStore()
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken()

  const menus = useMemo(() => {
    if (!user) return []
    const allowedKeys = roleMenuMap[user.role] || []
    return allMenus.filter((m) => allowedKeys.includes(m.key))
  }, [user])

  const selectedKey = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/flight')) return 'flight'
    if (path.startsWith('/waybill/security')) return 'security'
    if (path.startsWith('/waybill')) return 'waybill'
    if (path.startsWith('/uld')) return 'uld'
    if (path.startsWith('/review')) return 'review'
    return ''
  }, [location.pathname])

  const handleMenuClick = ({ key }: { key: string }) => {
    const menu = allMenus.find((m) => m.key === key)
    if (menu) navigate(menu.path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const userDropdownItems = [
    {
      key: 'user-info',
      label: (
        <Space direction="vertical" size={2} style={{ padding: '4px 8px' }}>
          <Text strong>{user?.realName || user?.username}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user?.role ? roleNameMap[user.role] : ''}
          </Text>
        </Space>
      ),
      disabled: true
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {collapsed ? '货运' : '货运板箱管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menus as any}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
          }}
        >
          <Space>
            <span
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
          </Space>
          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }} size={8}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <Text>{user?.realName || user?.username}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
