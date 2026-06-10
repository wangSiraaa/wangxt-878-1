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
  InputNumber,
  Progress,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  InboxOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getUldList, createUld, loadUld, unloadUld } from '@/api/uld'
import { getWaybillList } from '@/api/waybill'
import type { Uld, Waybill } from '@/types'

function UldList() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Uld[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchUldNo, setSearchUldNo] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | undefined>()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [createModal, setCreateModal] = useState(false)
  const [createForm] = Form.useForm()
  const [createLoading, setCreateLoading] = useState(false)

  const [loadModal, setLoadModal] = useState<{
    open: boolean
    record: Uld | null
  }>({ open: false, record: null })
  const [loadForm] = Form.useForm()
  const [loadLoading, setLoadLoading] = useState(false)
  const [waybillOptions, setWaybillOptions] = useState<Waybill[]>([])
  const [waybillLoading, setWaybillLoading] = useState(false)

  const [unloadModal, setUnloadModal] = useState<{
    open: boolean
    record: Uld | null
  }>({ open: false, record: null })
  const [unloadForm] = Form.useForm()
  const [unloadLoading, setUnloadLoading] = useState(false)
  const [uldWaybills, setUldWaybills] = useState<Waybill[]>([])
  const [uldWaybillsLoading, setUldWaybillsLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getUldList({
        page,
        size: pageSize,
        uldNo: searchUldNo || undefined,
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
    setSearchUldNo('')
    setSearchStatus(undefined)
    form.resetFields()
    setPage(1)
    setTimeout(fetchData, 0)
  }

  const handleOpenCreate = () => {
    setCreateModal(true)
    createForm.resetFields()
  }

  const handleCreate = async () => {
    setCreateLoading(true)
    try {
      const values = await createForm.validateFields()
      const res = await createUld(values)
      if (res.success || res.code === 200) {
        message.success('创建板箱成功')
        setCreateModal(false)
        fetchData()
      }
    } finally {
      setCreateLoading(false)
    }
  }

  const handleOpenLoad = async (record: Uld) => {
    setLoadModal({ open: true, record })
    loadForm.resetFields()
    setWaybillLoading(true)
    try {
      const res = await getWaybillList({
        status: 'SECURITY_PASSED',
        page: 1,
        size: 1000,
        flightId: record.flightId || undefined
      })
      setWaybillOptions((res.data as any).records || [])
    } finally {
      setWaybillLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!loadModal.record) return
    setLoadLoading(true)
    try {
      const values = await loadForm.validateFields()
      const res = await loadUld({
        uldId: loadModal.record.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.success || res.code === 200) {
        message.success('装板成功')
        setLoadModal({ open: false, record: null })
        fetchData()
      }
    } finally {
      setLoadLoading(false)
    }
  }

  const handleOpenUnload = async (record: Uld) => {
    setUnloadModal({ open: true, record })
    unloadForm.resetFields()
    setUldWaybillsLoading(true)
    try {
      const res = await getWaybillList({
        uldId: undefined as any,
        page: 1,
        size: 1000
      })
      const list: Waybill[] = ((res.data as any).records || []) as Waybill[]
      setUldWaybills(
        list.filter(
          (w) =>
            w.uldId === record.id &&
            (w.status === 'LOADED' || w.status === 'UNLOADED')
        )
      )
    } finally {
      setUldWaybillsLoading(false)
    }
  }

  const handleUnload = async () => {
    if (!unloadModal.record) return
    setUnloadLoading(true)
    try {
      const values = await unloadForm.validateFields()
      const res = await unloadUld({
        uldId: unloadModal.record.id,
        waybillId: values.waybillId,
        remark: values.remark
      })
      if (res.success || res.code === 200) {
        message.success('卸下成功')
        setUnloadModal({ open: false, record: null })
        fetchData()
      }
    } finally {
      setUnloadLoading(false)
    }
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    EMPTY: { color: 'default', text: '空板' },
    LOADING: { color: 'blue', text: '装板中' },
    FULL: { color: 'orange', text: '已满' },
    REVIEW_PENDING: { color: 'purple', text: '待复核' },
    REVIEW_PASSED: { color: 'green', text: '复核通过' },
    REVIEW_REJECTED: { color: 'red', text: '复核退回' }
  }

  const columns = [
    {
      title: '板箱号',
      dataIndex: 'uldNo',
      key: 'uldNo',
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
      title: '载重进度',
      key: 'weight',
      width: 220,
      render: (_: unknown, r: Uld) => {
        const pct = r.maxWeight ? Math.min((r.currentWeight / r.maxWeight) * 100, 100) : 0
        return (
          <Tooltip title={`当前 ${r.currentWeight}kg / 最大 ${r.maxWeight}kg`}>
            <div>
              <Progress
                percent={pct}
                size="small"
                status={pct >= 95 ? 'exception' : pct >= 80 ? 'active' : undefined}
              />
              <div style={{ fontSize: 12, color: '#666' }}>
                {r.currentWeight} / {r.maxWeight} kg ({pct.toFixed(1)}%)
              </div>
            </div>
          </Tooltip>
        )
      }
    },
    { title: '货邮单数', dataIndex: 'waybillCount', key: 'waybillCount', width: 100 },
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
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: Uld) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uld/${record.id}`)}
          >
            详情
          </Button>
          {(record.status === 'EMPTY' || record.status === 'LOADING' || record.status === 'REVIEW_REJECTED') && (
            <Tooltip title="装板">
              <Button
                type="link"
                size="small"
                icon={<ImportOutlined />}
                onClick={() => handleOpenLoad(record)}
              >
                装板
              </Button>
            </Tooltip>
          )}
          {record.waybillCount > 0 && (
            <Tooltip title="卸下">
              <Button
                type="link"
                size="small"
                icon={<ExportOutlined />}
                onClick={() => handleOpenUnload(record)}
              >
                卸下
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  const loadRecord = loadModal.record
  const unloadRecord = unloadModal.record

  return (
    <div>
      <Card
        title="板箱列表"
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 8 } }}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              创建板箱
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
              <Form.Item label="板箱号" style={{ marginBottom: 12 }}>
                <Input
                  allowClear
                  placeholder="请输入板箱号"
                  value={searchUldNo}
                  onChange={(e) => setSearchUldNo(e.target.value)}
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
                  options={Object.entries(statusMap).map(([k, v]) => ({
                    value: k,
                    label: v.text
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
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
        title="创建板箱"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={createLoading}
        okText="创建"
        destroyOnClose
        width={600}
      >
        <Form form={createForm} layout="vertical" initialValues={{ maxWeight: 1500 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="板箱号"
                name="uldNo"
                rules={[
                  { required: true, message: '请输入板箱号' },
                  { max: 50, message: '最多50个字符' }
                ]}
              >
                <Input placeholder="例如：PMC12345" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="板箱类型"
                name="uldType"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select
                  options={[
                    { value: 'PMC', label: 'PMC - 标准主甲板集装箱' },
                    { value: 'PAG', label: 'PAG - 标准主甲板集装箱' },
                    { value: 'PKB', label: 'PKB - 标准主甲板集装箱' },
                    { value: 'AKE', label: 'AKE - 标准下舱集装箱' },
                    { value: 'AVE', label: 'AVE - 标准下舱集装箱' },
                    { value: 'OTHER', label: '其他' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="最大载重(kg)"
                name="maxWeight"
                rules={[
                  { required: true, message: '请输入最大载重' },
                  { type: 'number', min: 1, message: '必须大于0' }
                ]}
              >
                <InputNumber min={1} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注（可选）" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={loadRecord ? `装板 - ${loadRecord.uldNo}` : '装板'}
        open={loadModal.open}
        onCancel={() => setLoadModal({ open: false, record: null })}
        onOk={handleLoad}
        confirmLoading={loadLoading}
        okText="确认装板"
        destroyOnClose
        width={600}
      >
        {loadRecord && (
          <div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>当前载重</div>
                  <div style={{ fontWeight: 600 }}>{loadRecord.currentWeight} kg</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>剩余载重</div>
                  <div style={{ fontWeight: 600, color: '#1677ff' }}>
                    {loadRecord.maxWeight - loadRecord.currentWeight} kg
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#666' }}>最大载重</div>
                  <div style={{ fontWeight: 600 }}>{loadRecord.maxWeight} kg</div>
                </Col>
              </Row>
            </div>
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
          </div>
        )}
      </Modal>

      <Modal
        title={unloadRecord ? `卸下货邮单 - ${unloadRecord.uldNo}` : '卸下货邮单'}
        open={unloadModal.open}
        onCancel={() => setUnloadModal({ open: false, record: null })}
        onOk={handleUnload}
        confirmLoading={unloadLoading}
        okText="确认卸下"
        okButtonProps={{ danger: true }}
        destroyOnClose
        width={600}
      >
        {unloadRecord && (
          <Form form={unloadForm} layout="vertical">
            <Form.Item
              label="选择要卸下的货邮单"
              name="waybillId"
              rules={[{ required: true, message: '请选择货邮单' }]}
            >
              <Select
                showSearch
                placeholder="选择货邮单"
                loading={uldWaybillsLoading}
                optionFilterProp="label"
                options={uldWaybills.map((w) => ({
                  value: w.id,
                  label: `${w.waybillNo} - ${w.weight}kg - ${w.status}`
                }))}
              />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="请输入备注（可选）" maxLength={500} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default UldList
