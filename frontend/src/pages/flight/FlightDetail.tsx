import { useState, useEffect } from 'react'
import {
  Descriptions,
  Card,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  App,
  Empty,
  Divider
} from 'antd'
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getFlightDetail } from '@/api/flight'
import { getWaybillList, getUldList } from '@/api/waybill'
import type { Flight, Waybill, Uld } from '@/types'

function FlightDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [ulds, setUlds] = useState<Uld[]>([])
  const [waybills, setWaybills] = useState<Waybill[]>([])

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [fRes, uRes, wRes] = await Promise.all([
        getFlightDetail(Number(id)),
        getUldList({ flightId: Number(id), page: 1, size: 1000 }),
        getWaybillList({ flightId: Number(id), page: 1, size: 1000 })
      ])
      setFlight(fRes.data)
      setUlds((uRes.data as any).records || [])
      setWaybills((wRes.data as any).records || [])
    } catch (e) {
      message.error('获取航班详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const statusMap: Record<string, { color: string; text: string }> = {
    OPEN: { color: 'green', text: '开启' },
    CLOSED: { color: 'default', text: '已关闭' }
  }

  const uldStatusMap: Record<string, { color: string; text: string }> = {
    EMPTY: { color: 'default', text: '空板' },
    LOADING: { color: 'blue', text: '装板中' },
    FULL: { color: 'orange', text: '已满' },
    REVIEW_PENDING: { color: 'purple', text: '待复核' },
    REVIEW_PASSED: { color: 'green', text: '复核通过' },
    REVIEW_REJECTED: { color: 'red', text: '复核退回' }
  }

  const waybillStatusMap: Record<string, { color: string; text: string }> = {
    CREATED: { color: 'default', text: '已创建' },
    SECURITY_PASSED: { color: 'green', text: '安检通过' },
    SECURITY_REJECTED: { color: 'red', text: '安检拒绝' },
    LOADED: { color: 'blue', text: '已装板' },
    UNLOADED: { color: 'orange', text: '已卸下' }
  }

  const weightPercent = flight && flight.maxWeight
    ? Math.min((flight.currentWeight / flight.maxWeight) * 100, 100)
    : 0

  const uldColumns = [
    {
      title: '板箱号',
      dataIndex: 'uldNo',
      key: 'uldNo',
      width: 160,
      render: (t: string, r: Uld) => (
        <a onClick={() => navigate(`/uld/${r.id}`)}>{t}</a>
      )
    },
    { title: '类型', dataIndex: 'uldType', key: 'uldType', width: 100 },
    {
      title: '装载重量(kg)',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      width: 140,
      render: (v: number, r: Uld) => `${v} / ${r.maxWeight}`
    },
    { title: '货邮单数', dataIndex: 'waybillCount', key: 'waybillCount', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const cfg = uldStatusMap[s] || { color: 'default', text: s }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, r: Uld) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/uld/${r.id}`)}
        >
          详情
        </Button>
      )
    }
  ]

  const waybillColumns = [
    {
      title: '货邮单号',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
      width: 160,
      render: (t: string) => <strong>{t}</strong>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t: string) => (t === 'CARGO' ? '货物' : '邮件')
    },
    { title: '托运人', dataIndex: 'shipper', key: 'shipper', width: 120 },
    { title: '收货人', dataIndex: 'consignee', key: 'consignee', width: 120 },
    { title: '重量(kg)', dataIndex: 'weight', key: 'weight', width: 100 },
    { title: '件数', dataIndex: 'pieces', key: 'pieces', width: 80 },
    { title: '关联板箱', dataIndex: 'uldNo', key: 'uldNo', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const cfg = waybillStatusMap[s] || { color: 'default', text: s }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    }
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>航班详情</h2>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        {flight && (
          <>
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="航班号">
                <strong style={{ fontSize: 16 }}>{flight.flightNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const cfg = statusMap[flight.status] || { color: 'default', text: flight.status }
                  return <Tag color={cfg.color}>{cfg.text}</Tag>
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="出发地">{flight.departure}</Descriptions.Item>
              <Descriptions.Item label="目的地">{flight.destination}</Descriptions.Item>
              <Descriptions.Item label="起飞时间">
                {dayjs(flight.departureTime).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(flight.createTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {flight.remark || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>载重进度</span>
                  <span style={{ color: weightPercent >= 90 ? '#ff4d4f' : '#1677ff' }}>
                    {flight.currentWeight} / {flight.maxWeight} kg ({weightPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  percent={weightPercent}
                  status={weightPercent >= 100 ? 'exception' : weightPercent >= 90 ? 'active' : undefined}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <Card
        title={`关联板箱 (${ulds.length})`}
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        {ulds.length === 0 ? (
          <div style={{ padding: 32 }}><Empty description="暂无关联板箱" /></div>
        ) : (
          <Table
            columns={uldColumns}
            dataSource={ulds}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      <Card
        title={`关联货邮单 (${waybills.length})`}
        styles={{ body: { padding: 0 } }}
      >
        {waybills.length === 0 ? (
          <div style={{ padding: 32 }}><Empty description="暂无关联货邮单" /></div>
        ) : (
          <Table
            columns={waybillColumns}
            dataSource={waybills}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>
    </div>
  )
}

export default FlightDetail
