import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Tag,
  App,
  Card,
  Form,
  Row,
  Col,
  Modal,
  Descriptions,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getWaybillList, securityCheck, getWaybillDetail } from '@/api/waybill'
import type { Waybill } from '@/types'

const { TextArea } = Input

function SecurityCheck() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Waybill[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchWaybillNo, setSearchWaybillNo] = useState('')
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  const [remarkModal, setRemarkModal] = useState<{
    open: boolean
    record: Waybill | null
    action: 'PASS' | 'REJECT' | null
  }>({ open: false, record: null, action: null })
  const [remarkForm] = Form.useForm()
  const [actionLoading, setActionLoading] = useState(false)

  const [detailModal, setDetailModal] = useState<{
    open: boolean
    record: Waybill | null
  }>({ open: false, record: null })
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getWaybillList({
        page,
        size: pageSize,
        waybillNo: searchWaybillNo || undefined,
        status: 'CREATED'
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
    form.resetFields()
    setPage(1)
    setTimeout(fetchData, 0)
  }

  const handleAction = (record: Waybill, action: 'PASS' | 'REJECT') => {
    setRemarkModal({ open: true, record, action })
    remarkForm.resetFields()
  }

  const handleConfirmAction = async () => {
    if (!remarkModal.record || !remarkModal.action) return
    setActionLoading(true)
    try {
      const values = await remarkForm.validateFields()
      const res = await securityCheck(remarkModal.record.id, {
        status:
          remarkModal.action === 'PASS'
            ? 'SECURITY_PASSED'
            : 'SECURITY_REJECTED',
        remark: values.remark
      })
      if (res.success || res.code === 200) {
        message.success(
          remarkModal.action === 'PASS' ? '安检通过成功' : '安检拒绝成功'
        )
        setRemarkModal({ open: false, record: null, action: null })
        fetchData()
      }
    } catch (e) {
    } finally {
      setActionLoading(false)
    }
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
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: () => <Tag color="orange">待安检</Tag>
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
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: Waybill) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Tooltip title="安检通过">
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleAction(record, 'PASS')}
              style={{ color: '#52c41a' }}
            >
              通过
            </Button>
          </Tooltip>
          <Tooltip title="安检拒绝">
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleAction(record, 'REJECT')}
            >
              拒绝
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ]

  const r = detailModal.record
  const actionRecord = remarkModal.record

  return (
    <div>
      <Card
        title="安检确认（待安检货邮单）"
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 8 } }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
            <Button onClick={() => navigate('/waybill')}>
              查看全部
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="horizontal">
          <Row gutter={24}>
            <Col span={12}>
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
            <Col span={12} style={{ textAlign: 'right' }}>
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
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条待安检`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            }
          }}
        />
      </Card>

      <Modal
        title={
          remarkModal.action === 'PASS' ? '安检通过确认' : '安检拒绝确认'
        }
        open={remarkModal.open}
        onCancel={() => setRemarkModal({ open: false, record: null, action: null })}
        confirmLoading={actionLoading}
        onOk={handleConfirmAction}
        okText="确认"
        okButtonProps={{
          danger: remarkModal.action === 'REJECT'
        }}
        destroyOnClose
      >
        {actionRecord && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="货邮单号">
                <strong>{actionRecord.waybillNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {actionRecord.type === 'CARGO' ? '货物' : '邮件'}
              </Descriptions.Item>
              <Descriptions.Item label="重量/件数">
                {actionRecord.weight} kg / {actionRecord.pieces} 件
              </Descriptions.Item>
              <Descriptions.Item label="托运人/收货人">
                {actionRecord.shipper} → {actionRecord.consignee}
              </Descriptions.Item>
            </Descriptions>
            <Form form={remarkForm} layout="vertical">
              <Form.Item
                label={remarkModal.action === 'REJECT' ? '拒绝原因（必填）' : '安检备注（可选）'}
                name="remark"
                rules={
                  remarkModal.action === 'REJECT'
                    ? [{ required: true, message: '请输入拒绝原因' }]
                    : []
                }
              >
                <TextArea
                  rows={4}
                  placeholder={
                    remarkModal.action === 'REJECT'
                      ? '请输入拒绝原因...'
                      : '请输入安检备注...'
                  }
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

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
              <Tag color="orange">待安检</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="托运人">{r.shipper}</Descriptions.Item>
            <Descriptions.Item label="收货人">{r.consignee}</Descriptions.Item>
            <Descriptions.Item label="重量(kg)">{r.weight}</Descriptions.Item>
            <Descriptions.Item label="件数">{r.pieces}</Descriptions.Item>
            <Descriptions.Item label="关联航班">{r.flightNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
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

export default SecurityCheck
