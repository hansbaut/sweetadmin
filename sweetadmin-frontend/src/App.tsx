import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Pedidos from './pages/Pedidos'
import Reportes from './pages/Reportes'
import Navbar from './components/Navbar'
import Logs from './pages/Logs'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
        <Route path="/pedidos" element={<PrivateRoute><Pedidos /></PrivateRoute>} />
        <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        <Route path="/logs" element={<PrivateRoute><Logs /></PrivateRoute>} />
      </Routes>
    </div>
  )
}

export default App