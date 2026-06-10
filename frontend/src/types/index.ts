export type UserRole = 'OPERATOR' | 'INSPECTOR' | 'REVIEWER' | 'SUPERVISOR'

export interface User {
  id: number
  username: string
  realName: string
  role: UserRole
  email?: string
  phone?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

export interface Result<T> {
  code: number
  message: string
  data: T
  success: boolean
}

export type FlightStatus = 'OPEN' | 'CLOSED'

export interface Flight {
  id: number
  flightNo: string
  departure: string
  destination: string
  departureTime: string
  status: FlightStatus
  maxWeight: number
  currentWeight: number
  remark?: string
  createTime: string
  updateTime: string
}

export type WaybillType = 'CARGO' | 'MAIL'
export type WaybillStatus = 'CREATED' | 'SECURITY_PASSED' | 'SECURITY_REJECTED' | 'LOADED' | 'UNLOADED'

export interface Waybill {
  id: number
  waybillNo: string
  type: WaybillType
  shipper: string
  consignee: string
  weight: number
  pieces: number
  flightId?: number
  flightNo?: string
  uldId?: number
  uldNo?: string
  status: WaybillStatus
  securityRemark?: string
  securityBy?: string
  securityTime?: string
  remark?: string
  createTime: string
  updateTime: string
}

export type UldStatus = 'EMPTY' | 'LOADING' | 'FULL' | 'REVIEW_PENDING' | 'REVIEW_PASSED' | 'REVIEW_REJECTED'

export interface Uld {
  id: number
  uldNo: string
  uldType: string
  flightId?: number
  flightNo?: string
  maxWeight: number
  currentWeight: number
  waybillCount: number
  status: UldStatus
  remark?: string
  createTime: string
  updateTime: string
}

export interface UldDetailVO {
  uld: Uld
  waybills: Waybill[]
  loadRecords: LoadRecord[]
  reviewRecords: ReviewRecord[]
}

export interface LoadRecord {
  id: number
  uldId: number
  uldNo: string
  waybillId: number
  waybillNo: string
  operationType: 'LOAD' | 'UNLOAD'
  weight: number
  operator: string
  remark?: string
  createTime: string
}

export interface ReviewRecord {
  id: number
  uldId: number
  uldNo: string
  reviewStatus: 'PENDING' | 'PASSED' | 'REJECTED'
  actualWeight?: number
  rejectReason?: string
  unlockToStatus?: string
  reviewer: string
  remark?: string
  createTime: string
}
