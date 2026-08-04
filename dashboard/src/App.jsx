import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LabOverview from './pages/LabOverview'
import MachineDetail from './pages/MachineDetail'
import AttendancePage from './pages/AttendancePage'
import Policies from './pages/Policies'
import Violations from './pages/Violations'
import Reports from './pages/Reports'
import UserManagement from './pages/UserManagement'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/labs" element={<LabOverview />} />
                <Route path="/machines" element={<MachineDetail />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/violations" element={<Violations />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/users" element={<UserManagement />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}

export default App