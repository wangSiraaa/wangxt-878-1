import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  App,
  Typography,
  Spin
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { createWaybill } from '@/api/waybill'
import { getFlightList } from '@/api/flight'
import type { Flight } from '@/types'

const { Title } = Typography

function WaybillCreate() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [flightLoading, setFlightLoading] = useState(false)
  const [flightOptions, setFlightOptions] = useState<Flight[]>([])
  const navigate = useNavigate()
  const { message } = App.useApp()

  useEffect(() => {
    const fetchFlights = async () => {
      setFlightLoading(true)
      try {
        const res = await getFlightList({ page: 1, size: 1000 })
        if (res.code === 200) {
          setFlightOptions(res.data.list || [])
        }
      } finally {
        setFlightLoading(false)
      }
    }
    fetchFlights()
  }, [])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const res = await createWaybill(values)
      if (res.code === 200) {
        message.success('录入货邮单成功')
        navigate('/waybill')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>录入货邮单</Title>
      </Space>

      <Card>
        <Spin spinning={flightLoading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ pieces: 1, dangerousFlag: false }}
            style={{ maxWidth: 900 }}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label="货邮单号"
                  name="waybillNo"
                  rules={[
                    { required: true, message: '请输入货邮单号' },
                    { max: 50, message: '货邮单号最多50个字符' }
                  ]}
                >
                  <Input placeholder="例如：774-12345678" allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="关联航班(可选)" name="flightId">
                  <Select
                    showSearch
                    placeholder="选择航班"
                    optionFilterProp="label"
                    allowClear
                    options={flightOptions.map((f) => ({
                      value: f.id,
                      label: `${f.flightNo} (${f.departure} → ${f.arrival})`
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label="托运人"
                  name="shipper"
                  rules={[
                    { required: true, message: '请输入托运人' },
                    { max: 100, message: '托运人最多100个字符' }
                  ]}
                >
                  <Input placeholder="请输入托运人名称" allowClear />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="收货人"
                  name="consignee"
                  rules={[
                    { required: true, message: '请输入收货人' },
                    { max: 100, message: '收货人最多100个字符' }
                  ]}
                >
                  <Input placeholder="请输入收货人名称" allowClear />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  label="件数"
                  name="pieces"
                  rules={[
                    { required: true, message: '请输入件数' },
                    { type: 'number', min: 1, message: '件数必须大于0' }
                  ]}
                >
                  <InputNumber min={1} max={99999} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="重量(kg)"
                  name="weight"
                  rules={[
                    { required: true, message: '请输入重量' },
                    { type: 'number', min: 0.01, message: '重量必须大于0' }
                  ]}
                >
                  <InputNumber
                    min={0.01}
                    max={100000}
                    step={0.1}
                    precision={2}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="体积(m³)" name="volume">
                  <InputNumber
                    min={0.01}
                    max={99999}
                    step={0.1}
                    precision={2}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="货物描述" name="goodsDescription">
                  <Input placeholder="请输入货物描述" allowClear maxLength={200} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="危险品" name="dangerousFlag" valuePropName="checked">
                  <Select
                    options={[
                      { value: false, label: '否' },
                      { value: true, label: '是' }
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="危险等级" name="dangerousLevel">
                  <Select
                    placeholder="选择等级"
                    allowClear
                    disabled={form.getFieldValue('dangerousFlag') !== true}
                    options={[
                      { value: 'LEVEL_1', label: '1级 - 低危险' },
                      { value: 'LEVEL_2', label: '2级 - 中危险' },
                      { value: 'LEVEL_3', label: '3级 - 高危险' }
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="说明备注" name="remark">
              <Input.TextArea
                rows={3}
                placeholder="请输入货邮单相关说明（如特殊处理要求、注意事项等）"
                maxLength={1000}
                showCount
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  提交
                </Button>
                <Button size="large" onClick={() => navigate(-1)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}

export default WaybillCreate
