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

const { Search } = Input

function WaybillList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Waybill[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchWaybillNo, setSearchWaybillNo] = useState('')
  const [searchType, setSearchType] = useState<string | undefined>()
  const [searchStatus, setSearchStatus] = useState<string | undefined>()
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
        type: searchType,
        status: searchStatus
      })
      setData(res.data.records || [])
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
    setSearchType(undefined)
    setSearchStatus(undefined)
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

  const statusMap: Record<string, { color: string; text: string }> = {
    CREATED: { color: 'default', text: '已创建' },
    SECURITY_PASSED: { color: 'green', text: '安检通过' },
    SECURITY_REJECTED: { color: 'red', text: '安检拒绝' },
    LOADED: { color: 'blue', text: '已装板' },
    UNLOADED: { color: 'orange', text: '已卸下' }
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
    { title: '关联航班', dataIndex: 'flightNo', key: 'flightNo', width: 120 },
    { title: '关联板箱', dataIndex: 'uldNo', key: 'uldNo', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const cfg = statusMap[s] || { color: 'default', text: s }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
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
              <Form.Item label="类型" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="请选择类型"
                  value={searchType}
                  onChange={(v) => setSearchType(v)}
                  options={[
                    { value: 'CARGO', label: '货物' },
                    { value: 'MAIL', label: '邮件' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="状态" style={{ marginBottom: 12 }}>
                <Select
                  allowClear
                  placeholder="请选择状态"
                  value={searchStatus}
                  onChange={(v) => setSearchStatus(v)}
                  options={Object.entries(statusMap).map(([k, v]) => ({
                    value: k,
                    label: v.text
                  }))}
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
          <Descriptions bordered column={2} size="small" loading={detailLoading}>
            <Descriptions.Item label="货邮单号" span={2}>
              <strong style={{ fontSize: 16 }}>{r.waybillNo}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              {r.type === 'CARGO' ? '货物' : '邮件'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                const cfg = statusMap[r.status] || { color: 'default', text: r.status }
                return <Tag color={cfg.color}>{cfg.text}</Tag>
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="托运人">{r.shipper}</Descriptions.Item>
            <Descriptions.Item label="收货人">{r.consignee}</Descriptions.Item>
            <Descriptions.Item label="重量(kg)">{r.weight}</Descriptions.Item>
            <Descriptions.Item label="件数">{r.pieces}</Descriptions.Item>
            <Descriptions.Item label="关联航班">{r.flightNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联板箱">{r.uldNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="安检人" span={2}>
              {r.securityBy || '-'}
              {r.securityTime
                ? ` (${dayjs(r.securityTime).format('YYYY-MM-DD HH:mm')})`
                : ''}
            </Descriptions.Item>
            <Descriptions.Item label="安检备注" span={2}>
              {r.securityRemark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(r.createTime).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {r.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default WaybillList
