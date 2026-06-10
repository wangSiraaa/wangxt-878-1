import request from '@/utils/request'
import type { Flight, PageResult, Result } from '@/types'

export const getFlightList = (params: {
  page?: number
  size?: number
  flightNo?: string
  status?: string
}) => {
  return request.get<any, Result<PageResult<Flight>>>('/flight', { params })
}

export const getFlightDetail = (id: number) => {
  return request.get<any, Result<Flight>>(`/flight/${id}`)
}

export const createFlight = (data: {
  flightNo: string
  departure: string
  destination: string
  departureTime: string
  maxWeight: number
  remark?: string
}) => {
  return request.post<any, Result<Flight>>('/flight', data)
}

export const closeFlight = (id: number) => {
  return request.put<any, Result<Flight>>(`/flight/${id}/close`)
}
