import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/login/Login'
import FlightList from '@/pages/flight/FlightList'
import FlightDetail from '@/pages/flight/FlightDetail'
import FlightCreate from '@/pages/flight/FlightCreate'
import WaybillList from '@/pages/waybill/WaybillList'
import WaybillCreate from '@/pages/waybill/WaybillCreate'
import SecurityCheck from '@/pages/waybill/SecurityCheck'
import UldList from '@/pages/uld/UldList'
import UldDetail from '@/pages/uld/UldDetail'
import ReviewList from '@/pages/review/ReviewList'
import { useUserStore } from '@/store/userStore'
import { useEffect } from 'react'

function App() {
  const { token } = useUserStore()

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored && !token) {
      useUserStore.getState().restoreFromStorage()
    }
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          token ? (
            <MainLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/flight" replace />} />
        <Route path="flight" element={<FlightList />} />
        <Route path="flight/create" element={<FlightCreate />} />
        <Route path="flight/:id" element={<FlightDetail />} />
        <Route path="waybill" element={<WaybillList />} />
        <Route path="waybill/create" element={<WaybillCreate />} />
        <Route path="waybill/security" element={<SecurityCheck />} />
        <Route path="uld" element={<UldList />} />
        <Route path="uld/:id" element={<UldDetail />} />
        <Route path="review" element={<ReviewList />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
