import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Links según rol
  const todosLosLinks = [
    { path: '/dashboard', label: '📊 Dashboard',  roles: ['admin', 'empleado', 'cliente'] },
    { path: '/productos', label: '🍰 Productos',  roles: ['admin', 'empleado'] },
    { path: '/pedidos',   label: '📦 Pedidos',    roles: ['admin', 'empleado', 'cliente'] },
    { path: '/reportes',  label: '📄 Reportes',   roles: ['admin'] },
    { path: '/logs',      label: '🔍 Logs',       roles: ['admin'] },
    { path: '/usuarios',  label: '👥 Usuarios',   roles: ['admin'] },
  ]

  // Filtrar según el rol del usuario actual
  const links = todosLosLinks.filter(link =>
    user?.rol && link.roles.includes(user.rol)
  )

  return (
    <nav className="bg-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍰</span>
          <span className="font-bold text-lg">SweetAdmin</span>
        </div>

        {/* Links filtrados por rol */}
        <div className="flex gap-2">
          {links.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? 'bg-white text-blue-800'
                  : 'hover:bg-blue-700'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Usuario y logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.nombre}</p>
            <p className="text-xs text-blue-300 capitalize">{user?.rol}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🚪 Salir
          </button>
        </div>

      </div>
    </nav>
  )
}
