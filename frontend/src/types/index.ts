export type UserRole = 'OPERATOR' | 'INSPECTOR' | 'REVIEWER' | 'SUPERVISOR'

export interface User {
  id: number
  username: string
  realName: string
  role: UserRole
}

export interface LoginResponse {
  token: string
  userId: number
  username: string
  realName: string
  role: UserRole
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}

export interface Result<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export type FlightStatus = 'CREATED' | 'LOADING' | 'CLOSED'

export interface Flight {
  id: number
  flightNo: string
  aircraftNo?: string
  departure: string
  arrival: string
  scheduledDeparture: string
  status: FlightStatus
  statusName?: string
  totalUldLimit?: number
  totalWeightLimit: number
  currentWeight?: number
  remark?: string
  closedAt?: string
  closedBy?: number
  closedByName?: string
  createdBy?: number
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface Waybill {
  id: number
  waybillNo: string
  flightId?: number
  flightNo?: string
  shipper?: string
  consignee?: string
  pieces: number
  weight: number
  volume?: number
  goodsDescription?: string
  dangerousFlag?: boolean
  dangerousLevel?: string
  securityStatus: string
  inspectedBy?: number
  inspectedByName?: string
  inspectedAt?: string
  securityRemark?: string
  loadedStatus: string
  currentUldId?: number
  currentUldCode?: string
  locked?: boolean
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface Uld {
  id: number
  uldCode: string
  uldType: string
  flightId?: number
  flightNo?: string
  weightLimit: number
  currentWeight: number
  tareWeight?: number
  reviewStatus: string
  locked?: boolean
  rejectReason?: string
  reviewedBy?: number
  reviewedAt?: string
  usedRatio?: number
  createdBy?: number
  createdAt: string
  updatedAt: string
}

export interface UldDetailVO extends Uld {
  waybills: Waybill[]
}

export interface LoadRecord {
  id: number
  uldId: number
  uldCode: string
  waybillId: number
  waybillNo: string
  operationType: 'LOAD' | 'UNLOAD'
  weight: number
  operator: string
  remark?: string
  createdAt: string
}

export interface ReviewRecord {
  id: number
  uldId: number
  uldCode: string
  reviewStatus: 'PENDING' | 'REVIEWING' | 'PASSED' | 'REJECTED'
  actualWeight?: number
  rejectReason?: string
  unlockToStatus?: string
  reviewer: string
  remark?: string
  createdAt: string
}

export function getUldDisplayStatus(uld: Uld): { key: string; color: string; text: string } {
  if (uld.reviewStatus === 'PASSED') return { key: 'PASSED', color: 'green', text: '复核通过' }
  if (uld.reviewStatus === 'REVIEWING') return { key: 'REVIEWING', color: 'purple', text: '复核中' }
  if (uld.reviewStatus === 'REJECTED') return { key: 'REJECTED', color: 'red', text: '复核退回' }
  if (uld.locked) return { key: 'LOCKED', color: 'orange', text: '已锁定' }
  if (!uld.currentWeight || uld.currentWeight === 0) return { key: 'EMPTY', color: 'default', text: '空板' }
  return { key: 'LOADING', color: 'blue', text: '装板中' }
}

export function getWaybillDisplayStatus(w: Waybill): { key: string; color: string; text: string } {
  if (w.loadedStatus === 'LOADED') return { key: 'LOADED', color: 'blue', text: '已装板' }
  if (w.loadedStatus === 'UNLOADED_REVIEW') return { key: 'UNLOADED_REVIEW', color: 'orange', text: '已卸下(复核)' }
  if (w.securityStatus === 'REJECTED') return { key: 'SECURITY_REJECTED', color: 'red', text: '安检拒绝' }
  if (w.securityStatus === 'PASSED') return { key: 'SECURITY_PASSED', color: 'green', text: '安检通过' }
  return { key: 'PENDING', color: 'default', text: '待安检' }
}
