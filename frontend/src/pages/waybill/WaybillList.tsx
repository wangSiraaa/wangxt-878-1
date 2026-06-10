import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  App,
  Card,
  Form,
  Row,
  Col,
  Modal,
  Descriptions
} from 'antd'
import { PlusOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getWaybillList, getWaybillDetail } from '@/api/waybill'
import type { Waybill } from '@/types'
import { getWaybillDisplayStatus } from '@/types'

const { Search } = Input

const securityStatusOptions = [
  { value: 'PENDING', label: '待安检' },
  { value: 'PASSED', label: '安检通过' },
  { value: 'REJECTED', label: '安检拒绝' }
]

const loadedStatusOptions = [
  { value: 'LOADED', label: '已装板' },
  { value: 'UNLOADED_REVIEW', label: '已卸下(复核)' }
]

function WaybillList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Waybill[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchWaybillNo, setSearchWaybillNo] = useState('')
  const [searchSecurityStatus, setSearchSecurityStatus] = useState<string | undefined>()
  const [searchLoadedStatus, setSearchLoadedStatus] = useState<string | undefined>()
  const [form] = Form.useForm()
  const [detailModal, setDetailModal] = useState<{
    open: boolean
    record: Waybill | null
  }>({ open: false, record: null })
  const [detailLoading, setDetailLoading] = useState(false)
  const navigate = useNavigate()
  const { message } = App.useApp()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getWaybillList({
        page,
        size: pageSize,
        waybillNo: searchWaybillNo || undefined,
        securityStatus: searchSecurityStatus,
        loadedStatus: searchLoadedStatus
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
    setSearchWaybillNo('')
    setSearchSecurityStatus(undefined)
    setSearchLoadedStatus(undefined)
    form.resetFields()
    setPage(1)
    setTimeout(fetchData, 0)
  }

  const handleViewDetail = async (record: Waybill) => {
    setDetailLoading(true)
    try {
      const res = await getWaybillDetail(record.id)
      setDetailModal({ open: true, record: res.data })
    } catch (e) {
      message.error('获取详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = [
    {
      title: '货邮单号',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
      width: 160,
      fixed: 'left' as const,
      render: (t: string) => <strong>{t}</strong>
    },
    { title: '托运人', dataIndex: 'shipper', key: 'shipper', width: 120 },
    { title: '收货人', dataIndex: 'consignee', key: 'consignee', width: 120 },
    { title: '重量(kg)', dataIndex: 'weight', key: 'weight', width: 100 },
    { title: '件数', dataIndex: 'pieces', key: 'pieces', width: 80 },
    { title: '关联航班', dataIndex: 'flightNo', key: 'flightNo', width: 120 },
    { title: '关联板箱', dataIndex: 'currentUldCode', key: 'currentUldCode', width: 140 },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: unknown, record: Waybill) => {
        const cfg = getWaybillDisplayStatus(record)
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Waybill) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ]

  const r = detailModal.record

  return (
    <div>
      <Card
        title="货邮单列表"
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 8 } }}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/waybill/create')}
            >
              录入货邮单
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="horizontal">
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item label="货邮单号" style={{ marginBottom: 12 }}>
                <Input
                  allowClear
                  placeholder="请输入货邮单号"
                  value={searchWaybillNo}
                  onChange={(e) => setSearchWaybillNo(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="安检状态" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="请选择安检状态"
                  value={searchSecurityStatus}
                  onChange={(v) => setSearchSecurityStatus(v)}
                  options={securityStatusOptions}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="装板状态" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="请选择装板状态"
                  value={searchLoadedStatus}
                  onChange={(v) => setSearchLoadedStatus(v)}
                  options={loadedStatusOptions}
                />
              </Form.Item>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" onClick={handleSearch}>搜索</Button>
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
          scroll={{ x: 1400 }}
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

      <Modal
        title="货邮单详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={[
          <Button key="close" onClick={() => setDetailModal({ open: false, record: null })}>
            关闭
          </Button>
        ]}
        width={700}
        destroyOnClose
      >
        {r && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="货邮单号" span={2}>
              <strong style={{ fontSize: 16 }}>{r.waybillNo}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                const cfg = getWaybillDisplayStatus(r)
                return <Tag color={cfg.color}>{cfg.text}</Tag>
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="关联板箱">
              {r.currentUldCode || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="托运人">{r.shipper}</Descriptions.Item>
            <Descriptions.Item label="收货人">{r.consignee}</Descriptions.Item>
            <Descriptions.Item label="重量(kg)">{r.weight}</Descriptions.Item>
            <Descriptions.Item label="件数">{r.pieces}</Descriptions.Item>
            <Descriptions.Item label="关联航班">{r.flightNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="安检人" span={2}>
              {r.inspectedByName || '-'}
              {r.inspectedAt
                ? ` (${dayjs(r.inspectedAt).format('YYYY-MM-DD HH:mm')})`
                : ''}
            </Descriptions.Item>
            <Descriptions.Item label="安检备注" span={2}>
              {r.securityRemark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {r.securityRemark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default WaybillList
