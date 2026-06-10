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
  Tabs
} from 'antd'
import {
  ArrowLeftOutlined,
  ImportOutlined,
  ExportOutlined,
  AuditOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getUldDetail, loadUld, unloadUld, submitReview } from '@/api/uld'
import { getWaybillList } from '@/api/waybill'
import { exportUldReport, downloadFile } from '@/api/export'
import type { UldDetailVO, Waybill, ReviewRecordVO } from '@/types'
import { getUldDisplayStatus, getWaybillDisplayStatus } from '@/types'

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
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch {
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
        securityStatus: 'PASSED',
        page: 1,
        size: 1000,
        flightId: detail.flightId || undefined
      })
      if (res.code === 200) {
        setWaybillOptions(res.data.list || [])
      }
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
        uldId: detail.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.code === 200) {
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
          uldId: detail.id,
          waybillId
        })
        if (res.code === 200) {
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
        uldId: detail.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.code === 200) {
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
        const res = await submitReview(detail.id)
        if (res.code === 200) {
          message.success('提交复核成功')
          fetchData()
        }
      }
    })
  }

  const handleExportReport = async () => {
    if (!detail) return
    try {
      const res = await exportUldReport(detail.id)
      const blob = new Blob([res as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const fileName = `板箱复核报告_${detail.uldCode}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`
      downloadFile(blob, fileName)
      message.success('导出成功')
    } catch (e) {
      message.error('导出失败')
    }
  }

  const waybills = detail?.waybills || []

  const loadedWaybills = waybills.filter((w) => w.loadedStatus === 'LOADED')

  const weightPercent =
    detail && detail.weightLimit
      ? Math.min((detail.currentWeight / detail.weightLimit) * 100, 100)
      : 0

  const canLoad =
    detail &&
    (detail.reviewStatus === 'PENDING' || detail.reviewStatus === 'REJECTED') &&
    !detail.locked
  const canUnload =
    detail &&
    loadedWaybills.length > 0 &&
    !detail.locked &&
    detail.reviewStatus !== 'REVIEWING'
  const canSubmit =
    detail &&
    loadedWaybills.length > 0 &&
    (detail.reviewStatus === 'PENDING' || detail.reviewStatus === 'REJECTED')

  const waybillColumns = [
    {
      title: '货邮单号',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
      width: 160,
      render: (t: string) => <strong>{t}</strong>
    },
    { title: '托运人', dataIndex: 'shipper', key: 'shipper', width: 120 },
    { title: '收货人', dataIndex: 'consignee', key: 'consignee', width: 120 },
    { title: '重量(kg)', dataIndex: 'weight', key: 'weight', width: 100 },
    { title: '件数', dataIndex: 'pieces', key: 'pieces', width: 80 },
    {
      title: '当前板箱',
      dataIndex: 'currentUldCode',
      key: 'currentUldCode',
      width: 140,
      render: (t: string) => t || '-'
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: unknown, w: Waybill) => {
        const s = getWaybillDisplayStatus(w)
        return <Tag color={s.color}>{s.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, r: Waybill) =>
        r.loadedStatus === 'LOADED' && canUnload ? (
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

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h2 style={{ margin: 0 }}>板箱详情</h2>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        {detail && (
          <>
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="板箱号">
                <strong style={{ fontSize: 16 }}>{detail.uldCode}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const s = getUldDisplayStatus(detail)
                  return <Tag color={s.color}>{s.text}</Tag>
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="类型">{detail.uldType}</Descriptions.Item>
              <Descriptions.Item label="关联航班">
                {detail.flightNo ? (
                  <a onClick={() => navigate(`/flight/${detail.flightId}`)}>
                    {detail.flightNo}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(detail.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
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
                    {detail.currentWeight} / {detail.weightLimit} kg ({weightPercent.toFixed(1)}%)
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
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportReport}
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                导出报表
              </Button>
            </Space>
          </>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 0 } }}>
        <Tabs
          items={[
            {
              key: 'loadedWaybills',
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
              key: 'reviewRecords',
              label: `审核结论 (${(detail?.reviewRecords || []).length})`,
              children: <ReviewRecordsTable records={detail?.reviewRecords || []} />
            }
          ]}
        />
      </Card>

      <Modal
        title={detail ? `装板 - ${detail.uldCode}` : '装板'}
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
                label: `${w.waybillNo} - ${w.weight}kg - ${w.shipper} → ${w.consignee} (${getWaybillDisplayStatus(w).text})`
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
                label: `${w.waybillNo} - ${w.weight}kg (${getWaybillDisplayStatus(w).text})`
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

const ReviewRecordsTable: React.FC<{ records: ReviewRecordVO[] }> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div style={{ padding: 40 }}>
        <Empty description="暂无审核记录" />
      </div>
    )
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作类型',
      dataIndex: 'reviewTypeName',
      key: 'reviewTypeName',
      width: 100,
      render: (val: string, record: ReviewRecordVO) => {
        let color = '#1890ff'
        if (val === '复核通过') color = '#52c41a'
        if (val === '复核退回') color = '#ff4d4f'
        if (val === '提交复核') color = '#722ed1'
        return <Tag color={color}>{val}</Tag>
      }
    },
    {
      title: '操作人',
      dataIndex: 'reviewerName',
      key: 'reviewerName',
      width: 100
    },
    {
      title: '理论重量(kg)',
      dataIndex: 'expectedWeight',
      key: 'expectedWeight',
      width: 120,
      render: (val?: number) => val?.toFixed(2) || '-'
    },
    {
      title: '实际重量(kg)',
      dataIndex: 'actualWeight',
      key: 'actualWeight',
      width: 120,
      render: (val?: number) => val?.toFixed(2) || '-'
    },
    {
      title: '重量差(kg)',
      dataIndex: 'weightDiff',
      key: 'weightDiff',
      width: 120,
      render: (val?: number) => {
        if (val === undefined || val === null) return '-'
        const color = Math.abs(val) > 5 ? '#ff4d4f' : '#52c41a'
        return <span style={{ color, fontWeight: 600 }}>{val.toFixed(2)}</span>
      }
    },
    {
      title: '退回原因',
      dataIndex: 'rejectReason',
      key: 'rejectReason',
      ellipsis: true,
      render: (val?: string) => val || '-'
    },
    {
      title: '解锁至状态',
      dataIndex: 'unlockToStatus',
      key: 'unlockToStatus',
      width: 110,
      render: (val?: string) => val || '-'
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (val?: string) => val || '-'
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={records}
      rowKey="id"
      pagination={{ pageSize: 10, showSizeChanger: false }}
      scroll={{ x: 1000 }}
    />
  )
}

export default UldDetail
