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
  Select,
  InputNumber,
  Progress,
  Tooltip,
  Divider,
  Empty,
  Spin
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  AuditOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getUldList, getUldDetail, passReview, rejectReview, submitReview } from '@/api/uld'
import type { Uld, UldDetailVO } from '@/types'
import { getUldDisplayStatus, getWaybillDisplayStatus } from '@/types'

const { TextArea } = Input

function ReviewList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Uld[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchUldNo, setSearchUldNo] = useState('')
  const [tabStatus, setTabStatus] = useState<string>('REVIEWING')
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()

  const [detailModal, setDetailModal] = useState<{
    open: boolean
    record: UldDetailVO | null
  }>({ open: false, record: null })
  const [detailLoading, setDetailLoading] = useState(false)

  const [passModal, setPassModal] = useState<{
    open: boolean
    record: Uld | null
  }>({ open: false, record: null })
  const [passForm] = Form.useForm()
  const [passLoading, setPassLoading] = useState(false)

  const [rejectModal, setRejectModal] = useState<{
    open: boolean
    record: Uld | null
  }>({ open: false, record: null })
  const [rejectForm] = Form.useForm()
  const [rejectLoading, setRejectLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getUldList({
        page,
        size: pageSize,
        uldNo: searchUldNo || undefined,
        reviewStatus: tabStatus || undefined
      })
      if (res.code === 200) {
        setData(res.data.list || [])
        setTotal(res.data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, tabStatus])

  const handleSearch = () => {
    setPage(1)
    fetchData()
  }

  const handleReset = () => {
    setSearchUldNo('')
    form.resetFields()
    setPage(1)
    setTimeout(fetchData, 0)
  }

  const handleViewDetail = async (record: Uld) => {
    setDetailLoading(true)
    try {
      const res = await getUldDetail(record.id)
      if (res.code === 200) {
        setDetailModal({ open: true, record: res.data })
      }
    } catch {
      message.error('获取详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenPass = (record: Uld) => {
    setPassModal({ open: true, record })
    passForm.setFieldsValue({
      actualWeight: record.currentWeight,
      remark: ''
    })
  }

  const handleConfirmPass = async () => {
    if (!passModal.record) return
    setPassLoading(true)
    try {
      const values = await passForm.validateFields()
      const res = await passReview(passModal.record.id, {
        actualWeight: values.actualWeight,
        remark: values.remark
      })
      if (res.code === 200) {
        message.success('复核通过成功')
        setPassModal({ open: false, record: null })
        fetchData()
      }
    } finally {
      setPassLoading(false)
    }
  }

  const handleOpenReject = (record: Uld) => {
    setRejectModal({ open: true, record })
    rejectForm.setFieldsValue({
      rejectReason: '',
      unlockToStatus: 'PENDING',
      remark: ''
    })
  }

  const handleConfirmReject = async () => {
    if (!rejectModal.record) return
    setRejectLoading(true)
    try {
      const values = await rejectForm.validateFields()
      const res = await rejectReview(rejectModal.record.id, {
        rejectReason: values.rejectReason,
        unlockToStatus: values.unlockToStatus,
        remark: values.remark
      })
      if (res.code === 200) {
        message.success('复核退回成功')
        setRejectModal({ open: false, record: null })
        fetchData()
      }
    } finally {
      setRejectLoading(false)
    }
  }

  const handleSubmitReview = (record: Uld) => {
    modal.confirm({
      title: '提交复核',
      content: `确认将板箱 ${record.uldCode} 提交复核？`,
      okText: '确认提交',
      onOk: async () => {
        const res = await submitReview(record.id)
        if (res.code === 200) {
          message.success('提交复核成功')
          fetchData()
        }
      }
    })
  }

  const tabs = [
    { key: 'REVIEWING', label: '待复核', color: 'purple' },
    { key: 'PASSED', label: '已通过', color: 'green' },
    { key: 'REJECTED', label: '已退回', color: 'red' },
    { key: '', label: '全部', color: 'default' }
  ]

  const columns = [
    {
      title: '板箱号',
      dataIndex: 'uldCode',
      key: 'uldCode',
      width: 160,
      fixed: 'left' as const,
      render: (t: string, r: Uld) => (
        <a onClick={() => navigate(`/uld/${r.id}`)}>
          <strong>{t}</strong>
        </a>
      )
    },
    { title: '类型', dataIndex: 'uldType', key: 'uldType', width: 100 },
    { title: '关联航班', dataIndex: 'flightNo', key: 'flightNo', width: 130 },
    {
      title: '申报重量(kg)',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      width: 140,
      render: (v: number, r: Uld) => (
        <Tooltip title={`限重 ${r.weightLimit}kg`}>
          <span>
            {v}
            <span style={{ color: '#999', marginLeft: 4 }}>
              ({r.weightLimit ? ((v / r.weightLimit) * 100).toFixed(1) : 0}%)
            </span>
          </span>
        </Tooltip>
      )
    },
    {
      title: '载重进度',
      key: 'weight',
      width: 200,
      render: (_: unknown, r: Uld) => {
        const pct = r.weightLimit ? Math.min((r.currentWeight / r.weightLimit) * 100, 100) : 0
        return (
          <Progress
            percent={pct}
            size="small"
            status={pct >= 95 ? 'exception' : undefined}
          />
        )
      }
    },
    { title: '货邮单数', key: 'waybillCount', width: 100, render: (_: unknown, r: Uld) => (r as any).waybills?.length ?? '-' },
    {
      title: '状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 120,
      render: (_: string, record: Uld) => {
        const s = getUldDisplayStatus(record)
        return <Tag color={s.color}>{s.text}</Tag>
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
      width: 280,
      fixed: 'right' as const,
      render: (_: unknown, record: Uld) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.reviewStatus === 'REVIEWING' && (
            <>
              <Tooltip title="复核通过">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleOpenPass(record)}
                  style={{ color: '#52c41a' }}
                >
                  通过
                </Button>
              </Tooltip>
              <Tooltip title="复核退回">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleOpenReject(record)}
                >
                  退回
                </Button>
              </Tooltip>
            </>
          )}
          {record.reviewStatus === 'REJECTED' && (
            <Tooltip title="重新提交复核">
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                onClick={() => handleSubmitReview(record)}
              >
                重新提交
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  const passRecord = passModal.record
  const rejectRecord = rejectModal.record
  const detail = detailModal.record

  return (
    <div>
      <Card
        title={
          <Space>
            <AuditOutlined style={{ color: '#722ed1' }} />
            复核管理
          </Space>
        }
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 0 } }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              刷新
            </Button>
          </Space>
        }
      >
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 0
          }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => {
                setTabStatus(tab.key)
                setPage(1)
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom:
                  tabStatus === tab.key ? '2px solid #1677ff' : '2px solid transparent',
                marginBottom: -1,
                fontWeight: tabStatus === tab.key ? 600 : 400,
                color: tabStatus === tab.key ? '#1677ff' : '#666'
              }}
            >
              <Tag color={tab.color as any} style={{ marginRight: 4 }}>
                {tab.label}
              </Tag>
            </div>
          ))}
        </div>
        <Form form={form} layout="horizontal" style={{ paddingTop: 12 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="板箱号" style={{ marginBottom: 12 }}>
                <Input
                  allowClear
                  placeholder="请输入板箱号"
                  prefix={<SearchOutlined />}
                  value={searchUldNo}
                  onChange={(e) => setSearchUldNo(e.target.value)}
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
          scroll={{ x: 1400 }}
          locale={{
            emptyText: tabStatus === 'REVIEWING' ? (
              <Empty description="暂无待复核板箱" />
            ) : undefined
          }}
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
        title="板箱复核详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={[
          <Button key="close" onClick={() => setDetailModal({ open: false, record: null })}>
            关闭
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {detail && (
          <Spin spinning={detailLoading}>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="板箱号" span={2}>
                <strong style={{ fontSize: 16 }}>{detail.uldCode}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="类型">{detail.uldType}</Descriptions.Item>
              <Descriptions.Item label="关联航班">{detail.flightNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="申报重量(kg)">
                <strong style={{ color: '#1677ff' }}>{detail.currentWeight}</strong> / {detail.weightLimit}
              </Descriptions.Item>
              <Descriptions.Item label="货邮单数">
                <strong>{detail.waybills.filter(w => w.loadedStatus === 'LOADED').length}</strong>
              </Descriptions.Item>
            </Descriptions>
            <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
              已装货邮单列表
            </Divider>
            {detail.waybills.filter(w => w.loadedStatus === 'LOADED').length === 0 ? (
              <Empty description="暂无货邮单" style={{ padding: 16 }} />
            ) : (
              <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: '货邮单号', dataIndex: 'waybillNo', width: 150 },
                    { title: '托运人', dataIndex: 'shipper', width: 100 },
                    { title: '收货人', dataIndex: 'consignee', width: 100 },
                    { title: '重量(kg)', dataIndex: 'weight', width: 90, align: 'right' as const },
                    {
                      title: '状态',
                      key: 'status',
                      width: 100,
                      render: (_: unknown, w: any) => {
                        const s = getWaybillDisplayStatus(w)
                        return <Tag color={s.color}>{s.text}</Tag>
                      }
                    }
                  ]}
                  dataSource={detail.waybills.filter(w => w.loadedStatus === 'LOADED')}
                  summary={(pageData) => {
                    let totalWeight = 0
                    pageData.forEach((r: any) => (totalWeight += r.weight))
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={3} align="right">
                            <strong>合计：</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <strong style={{ color: '#1677ff' }}>{totalWeight} kg</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    )
                  }}
                />
              </div>
            )}
          </Spin>
        )}
      </Modal>

      <Modal
        title={passRecord ? `复核通过 - ${passRecord.uldCode}` : '复核通过'}
        onCancel={() => setPassModal({ open: false, record: null })}
        onOk={handleConfirmPass}
        confirmLoading={passLoading}
        okText="确认通过"
        destroyOnClose
        width={500}
      >
        {passRecord && (
          <div>
            <div
              style={{
                padding: 16,
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
                marginBottom: 16
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>板箱号</div>
                  <div style={{ fontWeight: 600 }}>{passRecord.uldCode}</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>申报重量</div>
                  <div style={{ fontWeight: 600 }}>{passRecord.currentWeight} kg</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>货邮单数</div>
                  <div style={{ fontWeight: 600 }}>{(passRecord as any).waybills?.length || 0}</div>
                </Col>
              </Row>
            </div>
            <Form form={passForm} layout="vertical">
              <Form.Item
                label="实际复核重量(kg)"
                name="actualWeight"
                rules={[
                  { required: true, message: '请输入实际复核重量' },
                  { type: 'number', min: 0, message: '重量必须大于等于0' }
                ]}
              >
                <InputNumber
                  min={0}
                  max={100000}
                  step={0.1}
                  precision={2}
                  style={{ width: '100%' }}
                  addonAfter="kg"
                />
              </Form.Item>
              <Form.Item label="复核备注" name="remark">
                <TextArea rows={3} placeholder="请输入复核备注（可选）" maxLength={500} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title={rejectRecord ? `复核退回 - ${rejectRecord.uldCode}` : '复核退回'}
        open={rejectModal.open}
        onCancel={() => setRejectModal({ open: false, record: null })}
        onOk={handleConfirmReject}
        confirmLoading={rejectLoading}
        okText="确认退回"
        okButtonProps={{ danger: true }}
        destroyOnClose
        width={500}
      >
        {rejectRecord && (
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              label="退回原因"
              name="rejectReason"
              rules={[{ required: true, message: '请输入退回原因' }]}
            >
              <TextArea
                rows={4}
                placeholder="请详细说明退回原因，例如：重量不符、件数有误、货物异常等..."
                maxLength={500}
                showCount
              />
            </Form.Item>
            <Form.Item
              label="解锁至状态"
              name="unlockToStatus"
              rules={[{ required: true, message: '请选择解锁状态' }]}
            >
              <Select
                options={[
                  { value: 'PENDING', label: '装板中（可继续装板/卸下）' },
                  { value: 'EMPTY', label: '空板（需重新开始）' }
                ]}
              />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <TextArea rows={3} placeholder="请输入补充说明（可选）" maxLength={500} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default ReviewList
