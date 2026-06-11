import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Pedidos from './pages/Pedidos'
import Reportes from './pages/Reportes'
import Navbar from './components/Navbar'
import Logs from './pages/Logs'
import Usuarios from './pages/Usuarios'

// ─── Ruta privada: solo usuarios autenticados ─────────────────────────────────
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// ─── Ruta por rol: redirige al dashboard si no tiene permiso ──────────────────
const RoleRoute = ({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: string[]
}) => {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (!user || !roles.includes(user.rol)) return <Navigate to="/dashboard" />
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <Routes>

        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Todos los roles autenticados */}
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />

        {/* Admin y Empleado: CRUD productos */}
        <Route path="/productos" element={
          <RoleRoute roles={['admin', 'empleado']}>
            <Productos />
          </RoleRoute>
        } />

        {/* Admin, Empleado y Cliente: ver y crear pedidos */}
        <Route path="/pedidos" element={
          <PrivateRoute><Pedidos /></PrivateRoute>
        } />

        {/* Solo Admin: reportes PDF */}
        <Route path="/reportes" element={
          <RoleRoute roles={['admin']}>
            <Reportes />
          </RoleRoute>
        } />

        {/* Solo Admin: logs de acceso */}
        <Route path="/logs" element={
          <RoleRoute roles={['admin']}>
            <Logs />
          </RoleRoute>
        } />

        {/* Solo Admin: gestión de usuarios */}
        <Route path="/usuarios" element={
          <RoleRoute roles={['admin']}>
            <Usuarios />
          </RoleRoute>
        } />

        {/* Ruta por defecto */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
        } />

      </Routes>
    </div>
  )
}

export default App