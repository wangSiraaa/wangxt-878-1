import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  App,
  Typography
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { createFlight } from '@/api/flight'

const { Title } = Typography

function FlightCreate() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { message } = App.useApp()

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const payload = {
        ...values,
        departureTime: values.departureTime
          ? dayjs(values.departureTime).format('YYYY-MM-DDTHH:mm:ss')
          : undefined
      }
      const res = await createFlight(payload)
      if (res.success || res.code === 200) {
        message.success('创建航班成功')
        navigate('/flight')
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
        <Title level={4} style={{ margin: 0 }}>创建航班</Title>
      </Space>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ maxWeight: 5000 }}
          style={{ maxWidth: 900 }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="航班号"
                name="flightNo"
                rules={[
                  { required: true, message: '请输入航班号' },
                  { max: 20, message: '航班号最多20个字符' }
                ]}
              >
                <Input placeholder="例如：CA1234" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="起飞时间"
                name="departureTime"
                rules={[{ required: true, message: '请选择起飞时间' }]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder="请选择起飞时间"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="出发地"
                name="departure"
                rules={[{ required: true, message: '请输入出发地' }]}
              >
                <Input placeholder="例如：北京PEK" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="目的地"
                name="destination"
                rules={[{ required: true, message: '请输入目的地' }]}
              >
                <Input placeholder="例如：上海PVG" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="最大载重(kg)"
                name="maxWeight"
                rules={[
                  { required: true, message: '请输入最大载重' },
                  { type: 'number', min: 1, message: '最大载重必须大于0' }
                ]}
              >
                <InputNumber min={1} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="remark">
            <Input.TextArea
              rows={4}
              placeholder="请输入备注信息（可选）"
              maxLength={500}
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
                提交创建
              </Button>
              <Button size="large" onClick={() => navigate(-1)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default FlightCreate
