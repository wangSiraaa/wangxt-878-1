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
  Divider,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Tabs,
  Timeline
} from 'antd'
import {
  ArrowLeftOutlined,
  ImportOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  AuditOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getUldDetail, loadUld, unloadUld, submitReview } from '@/api/uld'
import { getWaybillList } from '@/api/waybill'
import type { UldDetailVO, Waybill, LoadRecord, ReviewRecord } from '@/types'

function UldDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<UldDetailVO | null>(null)

  const [loadModal, setLoadModal] = useState(false)
  const [loadForm] = Form.useForm()
  const [loadLoading, setLoadLoading] = useState(false)
  const [waybillOptions, setWaybillOptions] = useState<Waybill[]>([])
  const [waybillLoading, setWaybillLoading] = useState(false)

  const [unloadModal, setUnloadModal] = useState(false)
  const [unloadForm] = Form.useForm()
  const [unloadLoading, setUnloadLoading] = useState(false)

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getUldDetail(Number(id))
      setDetail(res.data)
    } catch (e) {
      message.error('获取板箱详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleOpenLoad = async () => {
    if (!detail) return
    setLoadModal(true)
    loadForm.resetFields()
    setWaybillLoading(true)
    try {
      const res = await getWaybillList({
        status: 'SECURITY_PASSED',
        page: 1,
        size: 1000,
        flightId: detail.uld.flightId || undefined
      })
      setWaybillOptions((res.data as any).records || [])
    } finally {
      setWaybillLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!detail) return
    setLoadLoading(true)
    try {
      const values = await loadForm.validateFields()
      const res = await loadUld({
        uldId: detail.uld.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.success || res.code === 200) {
        message.success('装板成功')
        setLoadModal(false)
        fetchData()
      }
    } finally {
      setLoadLoading(false)
    }
  }

  const handleUnload = async (waybillId: number) => {
    if (!detail) return
    modal.confirm({
      title: '确认卸下货邮单',
      content: '确认要卸下此货邮单吗？',
      okText: '确认卸下',
      okType: 'danger',
      onOk: async () => {
        const res = await unloadUld({
          uldId: detail.uld.id,
          waybillId
        })
        if (res.success || res.code === 200) {
          message.success('卸下成功')
          fetchData()
        }
      }
    })
  }

  const handleOpenUnloadModal = () => {
    setUnloadModal(true)
    unloadForm.resetFields()
  }

  const handleUnloadModalSubmit = async () => {
    if (!detail) return
    setUnloadLoading(true)
    try {
      const values = await unloadForm.validateFields()
      const res = await unloadUld({
        uldId: detail.uld.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.success || res.code === 200) {
        message.success('卸下成功')
        setUnloadModal(false)
        fetchData()
      }
    } finally {
      setUnloadLoading(false)
    }
  }

  const handleSubmitReview = () => {
    if (!detail) return
    modal.confirm({
      title: '提交复核',
      content: '确认将此板箱提交复核？提交后将锁定板箱内容。',
      okText: '确认提交',
      onOk: async () => {
        const res = await submitReview(detail.uld.id)
        if (res.success || res.code === 200) {
          message.success('提交复核成功')
          fetchData()
        }
      }
    })
  }

  const uld = detail?.uld
  const waybills = detail?.waybills || []
  const loadRecords = detail?.loadRecords || []
  const reviewRecords = detail?.reviewRecords || []

  const loadedWaybills = waybills.filter((w) => w.status === 'LOADED')

  const weightPercent =
    uld && uld.maxWeight
      ? Math.min((uld.currentWeight / uld.maxWeight) * 100, 100)
      : 0

  const statusMap: Record<string, { color: string; text: string }> = {
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

  const canLoad =
    uld &&
    (uld.status === 'EMPTY' ||
      uld.status === 'LOADING' ||
      uld.status === 'REVIEW_REJECTED')
  const canUnload = uld && loadedWaybills.length > 0 && uld.status !== 'REVIEW_PENDING' && uld.status !== 'REVIEW_PASSED'
  const canSubmit =
    uld &&
    loadedWaybills.length > 0 &&
    (uld.status === 'LOADING' || uld.status === 'FULL' || uld.status === 'REVIEW_REJECTED')

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
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const cfg = waybillStatusMap[s] || { color: 'default', text: s }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, r: Waybill) =>
        r.status === 'LOADED' && canUnload ? (
          <Button
            type="link"
            size="small"
            danger
            icon={<ExportOutlined />}
            onClick={() => handleUnload(r.id)}
          >
            卸下
          </Button>
        ) : null
    }
  ]

  const loadRecordColumns = [
    {
      title: '操作时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 80,
      render: (t: string) =>
        t === 'LOAD' ? (
          <Tag color="blue"><ImportOutlined /> 装板</Tag>
        ) : (
          <Tag color="orange"><ExportOutlined /> 卸下</Tag>
        )
    },
    { title: '板箱号', dataIndex: 'uldNo', key: 'uldNo', width: 140 },
    { title: '货邮单号', dataIndex: 'waybillNo', key: 'waybillNo', width: 160 },
    { title: '重量(kg)', dataIndex: 'weight', key: 'weight', width: 100 },
    { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 200, render: (t: string) => t || '-' }
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>板箱详情</h2>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        {uld && (
          <>
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="板箱号">
                <strong style={{ fontSize: 16 }}>{uld.uldNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const cfg = statusMap[uld.status] || { color: 'default', text: uld.status }
                  return <Tag color={cfg.color}>{cfg.text}</Tag>
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="类型">{uld.uldType}</Descriptions.Item>
              <Descriptions.Item label="关联航班">
                {uld.flightNo ? (
                  <a onClick={() => navigate(`/flight/${uld.flightId}`)}>
                    {uld.flightNo}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(uld.createTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(uld.updateTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {uld.remark || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>载重进度</span>
                  <span style={{ color: weightPercent >= 90 ? '#ff4d4f' : '#1677ff' }}>
                    {uld.currentWeight} / {uld.maxWeight} kg ({weightPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  percent={weightPercent}
                  status={
                    weightPercent >= 100
                      ? 'exception'
                      : weightPercent >= 90
                      ? 'active'
                      : undefined
                  }
                />
              </div>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>货邮单数</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{loadedWaybills.length}</div>
              </div>
            </div>
            <Space wrap>
              {canLoad && (
                <Button type="primary" icon={<ImportOutlined />} onClick={handleOpenLoad}>
                  装板
                </Button>
              )}
              {canUnload && (
                <Button icon={<ExportOutlined />} onClick={handleOpenUnloadModal}>
                  卸下货邮单
                </Button>
              )}
              {canSubmit && (
                <Button
                  icon={<AuditOutlined />}
                  onClick={handleSubmitReview}
                  style={{ background: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
                >
                  提交复核
                </Button>
              )}
            </Space>
          </>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 0 } }}>
        <Tabs
          items={[
            {
              key: 'waybills',
              label: `已装货邮单 (${loadedWaybills.length})`,
              children:
                loadedWaybills.length === 0 ? (
                  <div style={{ padding: 40 }}>
                    <Empty description="暂无已装货邮单" />
                  </div>
                ) : (
                  <Table
                    columns={waybillColumns}
                    dataSource={loadedWaybills}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1000 }}
                  />
                )
            },
            {
              key: 'allWaybills',
              label: `全部货邮单 (${waybills.length})`,
              children:
                waybills.length === 0 ? (
                  <div style={{ padding: 40 }}>
                    <Empty description="暂无货邮单记录" />
                  </div>
                ) : (
                  <Table
                    columns={waybillColumns}
                    dataSource={waybills}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1000 }}
                  />
                )
            },
            {
              key: 'loadRecords',
              label: `装卸记录 (${loadRecords.length})`,
              children:
                loadRecords.length === 0 ? (
                  <div style={{ padding: 40 }}>
                    <Empty description="暂无装卸记录" />
                  </div>
                ) : (
                  <Table
                    columns={loadRecordColumns}
                    dataSource={loadRecords}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1000 }}
                  />
                )
            },
            {
              key: 'reviewRecords',
              label: `复核记录 (${reviewRecords.length})`,
              children:
                reviewRecords.length === 0 ? (
                  <div style={{ padding: 40 }}>
                    <Empty description="暂无复核记录" />
                  </div>
                ) : (
                  <Timeline
                    style={{ padding: 24 }}
                    items={reviewRecords.map((r: ReviewRecord) => ({
                      color:
                        r.reviewStatus === 'PASSED'
                          ? 'green'
                          : r.reviewStatus === 'REJECTED'
                          ? 'red'
                          : 'blue',
                      children: (
                        <Card size="small" style={{ marginBottom: 8 }}>
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            <Space>
                              <Tag
                                color={
                                  r.reviewStatus === 'PASSED'
                                    ? 'green'
                                    : r.reviewStatus === 'REJECTED'
                                    ? 'red'
                                    : 'blue'
                                }
                              >
                                {r.reviewStatus === 'PASSED'
                                  ? '复核通过'
                                  : r.reviewStatus === 'REJECTED'
                                  ? '复核退回'
                                  : '待复核'}
                              </Tag>
                              <span style={{ color: '#666', fontSize: 12 }}>
                                {dayjs(r.createTime).format('YYYY-MM-DD HH:mm:ss')}
                              </span>
                            </Space>
                            <div>
                              <Text_weak>复核人：</Text_weak>
                              {r.reviewer}
                            </div>
                            {r.actualWeight !== undefined && (
                              <div>
                                <Text_weak>实际重量：</Text_weak>
                                {r.actualWeight} kg
                              </div>
                            )}
                            {r.rejectReason && (
                              <div>
                                <Text_weak>退回原因：</Text_weak>
                                <span style={{ color: '#ff4d4f' }}>{r.rejectReason}</span>
                              </div>
                            )}
                            {r.unlockToStatus && (
                              <div>
                                <Text_weak>解锁至状态：</Text_weak>
                                {r.unlockToStatus}
                              </div>
                            )}
                            {r.remark && (
                              <div>
                                <Text_weak>备注：</Text_weak>
                                {r.remark}
                              </div>
                            )}
                          </Space>
                        </Card>
                      )
                    }))}
                  />
                )
            }
          ]}
        />
      </Card>

      <Modal
        title={uld ? `装板 - ${uld.uldNo}` : '装板'}
        open={loadModal}
        onCancel={() => setLoadModal(false)}
        onOk={handleLoad}
        confirmLoading={loadLoading}
        okText="确认装板"
        destroyOnClose
        width={600}
      >
        <Form form={loadForm} layout="vertical">
          <Form.Item
            label="选择货邮单（仅显示已安检通过的）"
            name="waybillId"
            rules={[{ required: true, message: '请选择货邮单' }]}
          >
            <Select
              showSearch
              placeholder="选择货邮单"
              loading={waybillLoading}
              optionFilterProp="label"
              options={waybillOptions.map((w) => ({
                value: w.id,
                label: `${w.waybillNo} - ${w.weight}kg - ${w.shipper} → ${w.consignee}`
              }))}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注（可选）" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="卸下货邮单"
        open={unloadModal}
        onCancel={() => setUnloadModal(false)}
        onOk={handleUnloadModalSubmit}
        confirmLoading={unloadLoading}
        okText="确认卸下"
        okButtonProps={{ danger: true }}
        destroyOnClose
        width={600}
      >
        <Form form={unloadForm} layout="vertical">
          <Form.Item
            label="选择要卸下的货邮单"
            name="waybillId"
            rules={[{ required: true, message: '请选择货邮单' }]}
          >
            <Select
              showSearch
              placeholder="选择货邮单"
              optionFilterProp="label"
              options={loadedWaybills.map((w) => ({
                value: w.id,
                label: `${w.waybillNo} - ${w.weight}kg`
              }))}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注（可选）" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function Text_weak({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#999' }}>{children}</span>
}

export default UldDetail
