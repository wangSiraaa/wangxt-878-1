import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Popconfirm,
  App,
  Card,
  Form,
  Row,
  Col
} from 'antd'
import { PlusOutlined, EyeOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getFlightList, closeFlight } from '@/api/flight'
import type { Flight } from '@/types'

const { Search } = Input

function FlightList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Flight[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchFlightNo, setSearchFlightNo] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | undefined>()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getFlightList({
        page,
        size: pageSize,
        flightNo: searchFlightNo || undefined,
        status: searchStatus
      })
      setData(res.data.list || [])
      setTotal(res.data.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize])

  const handleSearch = () => {
    setPage(1)
    fetchData()
  }

  const handleReset = () => {
    setSearchFlightNo('')
    setSearchStatus(undefined)
    form.resetFields()
    setPage(1)
    setTimeout(fetchData, 0)
  }

  const handleClose = async (record: Flight) => {
    modal.confirm({
      title: '确认关闭航班',
      content: `确定要关闭航班 ${record.flightNo} 吗？关闭后将无法再进行装板操作。`,
      okText: '确认关闭',
      okType: 'danger',
      onOk: async () => {
        const res = await closeFlight(record.id)
        if (res.code === 200) {
          message.success('航班关闭成功')
          fetchData()
        }
      }
    })
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    CREATED: { color: 'green', text: '开启' },
    LOADING: { color: 'blue', text: '装载中' },
    CLOSED: { color: 'default', text: '已关闭' }
  }

  const columns = [
    {
      title: '航班号',
      dataIndex: 'flightNo',
      key: 'flightNo',
      width: 140,
      fixed: 'left' as const,
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '出发地',
      dataIndex: 'departure',
      key: 'departure',
      width: 100
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      key: 'destination',
      width: 100
    },
    {
      title: '起飞时间',
      dataIndex: 'departureTime',
      key: 'departureTime',
      width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '最大载重(kg)',
      dataIndex: 'totalWeightLimit',
      key: 'totalWeightLimit',
      width: 120
    },
    {
      title: '当前载重(kg)',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      width: 120,
      render: (val: number, record: Flight) => {
        const pct = record.totalWeightLimit ? (val / record.totalWeightLimit) * 100 : 0
        const color = pct >= 90 ? 'red' : pct >= 70 ? 'orange' : 'green'
        return (
          <span>
            <span style={{ color }}>{val}</span>
            <span style={{ color: '#999', marginLeft: 4 }}>({pct.toFixed(1)}%)</span>
          </span>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const cfg = statusMap[s] || { color: 'default', text: s }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Flight) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/flight/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'CREATED' && (
            <Popconfirm
              title="确认关闭此航班？"
              onConfirm={() => handleClose(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
              >
                关闭
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title="航班列表"
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 8 } }}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/flight/create')}
            >
              创建航班
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="horizontal">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="航班号" style={{ marginBottom: 12 }}>
                <Input
                  allowClear
                  placeholder="请输入航班号"
                  value={searchFlightNo}
                  onChange={(e) => setSearchFlightNo(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="状态" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="请选择状态"
                  value={searchStatus}
                  onChange={(v) => setSearchStatus(v)}
                  options={[
                    { value: 'CREATED', label: '开启' },
                    { value: 'LOADING', label: '装载中' },
                    { value: 'CLOSED', label: '已关闭' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          columns={columns}
          dataSource={data}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            }
          }}
        />
      </Card>
    </div>
  )
}

export default FlightList
