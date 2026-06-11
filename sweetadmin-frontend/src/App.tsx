import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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

      {/* ─── Toaster global — aparece en toda la app ─── */}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            padding: '12px 16px',
            maxWidth: '380px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
          },
        }}
      />

      {isAuthenticated && <Navbar />}

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />

        <Route path="/productos" element={
          <RoleRoute roles={['admin', 'empleado']}>
            <Productos />
          </RoleRoute>
        } />

        <Route path="/pedidos" element={
          <PrivateRoute><Pedidos /></PrivateRoute>
        } />

        <Route path="/reportes" element={
          <RoleRoute roles={['admin']}>
            <Reportes />
          </RoleRoute>
        } />

        <Route path="/logs" element={
          <RoleRoute roles={['admin']}>
            <Logs />
          </RoleRoute>
        } />

        <Route path="/usuarios" element={
          <RoleRoute roles={['admin']}>
            <Usuarios />
          </RoleRoute>
        } />

        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
        } />
      </Routes>
    </div>
  )
}

export default App