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
  aircraftNo?: string
  departure: string
  arrival: string
  scheduledDeparture: string
  totalUldLimit?: number
  totalWeightLimit: number
}) => {
  return request.post<any, Result<Flight>>('/flight', data)
}

export const closeFlight = (id: number) => {
  return request.put<any, Result<Flight>>(`/flight/${id}/close`)
}
