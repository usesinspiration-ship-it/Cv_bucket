import { Navigate, Route, Routes } from 'react-router-dom'
import { ConfigurationErrorScreen } from './components/ConfigurationErrorScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

function App() {
  const { loading, profileLoading, user, configError } = useAuth()

  if (configError) {
    return <ConfigurationErrorScreen message={configError} />
  }

  if (loading || (user && profileLoading)) {
    return <LoadingScreen message="Preparing your CV workspace..." />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
