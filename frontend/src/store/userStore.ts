import { create } from 'zustand'
import type { User, LoginResponse } from '@/types'

interface UserState {
  token: string | null
  user: User | null
  setAuth: (data: LoginResponse) => void
  logout: () => void
  restoreFromStorage: () => void
}

export const useUserStore = create<UserState>((set) => ({
  token: null,
  user: null,
  setAuth: (data: LoginResponse) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ token: data.token, user: data.user })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },
  restoreFromStorage: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ token, user })
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }
}))
