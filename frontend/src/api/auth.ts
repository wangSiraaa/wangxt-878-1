import request from '@/utils/request'
import type { LoginResponse, Result } from '@/types'

export const login = (data: { username: string; password: string }) => {
  return request.post<any, Result<LoginResponse>>('/auth/login', data)
}

export const healthCheck = () => {
  return request.get<any, Result<any>>('/health')
}
