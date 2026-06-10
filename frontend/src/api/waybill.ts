import request from '@/utils/request'
import type { Waybill, PageResult, Result } from '@/types'

export const getWaybillList = (params: {
  page?: number
  size?: number
  waybillNo?: string
  type?: string
  status?: string
  flightId?: number
}) => {
  return request.get<any, Result<PageResult<Waybill>>>('/waybill', { params })
}

export const getWaybillDetail = (id: number) => {
  return request.get<any, Result<Waybill>>(`/waybill/${id}`)
}

export const createWaybill = (data: {
  waybillNo: string
  type: string
  shipper: string
  consignee: string
  weight: number
  pieces: number
  flightId?: number
  remark?: string
}) => {
  return request.post<any, Result<Waybill>>('/waybill', data)
}

export const securityCheck = (
  id: number,
  data: { status: string; remark?: string }
) => {
  return request.put<any, Result<Waybill>>(`/waybill/${id}/security`, data)
}
