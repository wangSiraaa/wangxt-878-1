import request from '@/utils/request'
import type { Uld, UldDetailVO, PageResult, Result } from '@/types'

export const getUldList = (params: {
  page?: number
  size?: number
  uldNo?: string
  status?: string
  flightId?: number
}) => {
  return request.get<any, Result<PageResult<Uld>>>('/uld', { params })
}

export const getUldDetail = (id: number) => {
  return request.get<any, Result<UldDetailVO>>(`/uld/${id}`)
}

export const createUld = (data: {
  uldNo: string
  uldType: string
  maxWeight: number
  flightId?: number
  remark?: string
}) => {
  return request.post<any, Result<Uld>>('/uld', data)
}

export const loadUld = (data: {
  waybillId: number
  uldId: number
  remark?: string
}) => {
  return request.post<any, Result<any>>('/uld/load', data)
}

export const unloadUld = (data: {
  waybillId: number
  uldId: number
  remark?: string
}) => {
  return request.post<any, Result<any>>('/uld/unload', data)
}

export const submitReview = (id: number) => {
  return request.post<any, Result<any>>(`/uld/${id}/review/submit`)
}

export const passReview = (
  id: number,
  data: { actualWeight: number; remark?: string }
) => {
  return request.put<any, Result<any>>(`/uld/${id}/review/pass`, data)
}

export const rejectReview = (
  id: number,
  data: { rejectReason: string; unlockToStatus: string; remark?: string }
) => {
  return request.put<any, Result<any>>(`/uld/${id}/review/reject`, data)
}
