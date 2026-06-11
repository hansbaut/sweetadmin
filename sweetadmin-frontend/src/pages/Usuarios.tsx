import { useEffect, useState } from 'react'
import api from '../services/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Usuario {
  id: number
  nombre: string
  email: string
  rol: 'admin' | 'empleado' | 'cliente'
  fuerza_password: 'debil' | 'intermedio' | 'fuerte'
  activo: boolean
  created_at: string
}

interface FormData {
  nombre: string
  email: string
  password: string
  rol: 'admin' | 'empleado' | 'cliente'
}

// ─── Utilidades de contraseña ────────────────────────────────────────────────
function evaluarFuerza(password: string): {
  nivel: 'debil' | 'intermedio' | 'fuerte'
  etiqueta: string
  color: string
  barColor: string
  puntos: number
} {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*]/.test(password),
  ]
  const puntos = checks.filter(Boolean).length
  if (puntos <= 1) return { nivel: 'debil',      etiqueta: 'Débil',      color: 'text-red-600',    barColor: 'bg-red-500',    puntos }
  if (puntos <= 3) return { nivel: 'intermedio', etiqueta: 'Intermedio', color: 'text-yellow-600', barColor: 'bg-yellow-400', puntos }
  return              { nivel: 'fuerte',     etiqueta: 'Fuerte',     color: 'text-green-600',  barColor: 'bg-green-500',  puntos }
}

// ─── Badges ──────────────────────────────────────────────────────────────────
const rolBadge: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  empleado: 'bg-blue-100 text-blue-700',
  cliente:  'bg-gray-100 text-gray-700',
}
const fuerzaBadge: Record<string, string> = {
  debil:      'bg-red-100 text-red-600',
  intermedio: 'bg-yellow-100 text-yellow-600',
  fuerte:     'bg-green-100 text-green-700',
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<Usuario | null>(null)

  const [form, setForm] = useState<FormData>({ nombre: '', email: '', password: '', rol: 'cliente' })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [fuerza, setFuerza] = useState(evaluarFuerza(''))
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ─── Cargar usuarios ────────────────────────────────────────────────────
  const cargar = () => {
    setLoading(true)
    api.get('/users')
      .then(res => setUsuarios(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  // ─── Abrir modal para crear ──────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null)
    setForm({ nombre: '', email: '', password: '', rol: 'cliente' })
    setErrors({})
    setFuerza(evaluarFuerza(''))
    setShowPassword(false)
    setShowModal(true)
  }

  // ─── Abrir modal para editar ─────────────────────────────────────────────
  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol })
    setErrors({})
    setFuerza(evaluarFuerza(''))
    setShowPassword(false)
    setShowModal(true)
  }

  // ─── Cambio en inputs ────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))

    // Actualizar barra de fortaleza al tipear contraseña
    if (name === 'password') setFuerza(evaluarFuerza(value))

    // Limpiar error del campo al corregirlo
    setErrors(prev => { const n = { ...prev }; delete n[name as keyof FormData]; return n })
  }

  // ─── Validación del formulario ───────────────────────────────────────────
  const validar = (): boolean => {
    const e: Partial<FormData> = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.email.trim()) {
      e.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Correo electrónico inválido'
    }
    if (!editando && !form.password) {
      e.password = 'La contraseña es obligatoria'
    } else if (form.password && form.password.length < 6) {
      e.password = 'Mínimo 6 caracteres'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Guardar (crear o editar) ────────────────────────────────────────────
  const guardar = async () => {
    if (!validar()) return
    setSaving(true)
    try {
      const payload: Partial<FormData> = { nombre: form.nombre, email: form.email, rol: form.rol }
      if (form.password) payload.password = form.password

      if (editando) {
        await api.put(`/users/${editando.id}`, payload)
      } else {
        await api.post('/users', payload)
      }
      setShowModal(false)
      cargar()
    } catch (err: any) {
      const msg = err.response?.data?.message
      if (typeof msg === 'string' && msg.includes('correo')) {
        setErrors(prev => ({ ...prev, email: msg }))
      } else {
        alert(Array.isArray(msg) ? msg.join('\n') : (msg || 'Error al guardar'))
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Cambiar rol rápido desde la tabla ──────────────────────────────────
  const cambiarRol = async (id: number, rol: string) => {
    await api.patch(`/users/${id}/rol`, { rol })
    cargar()
  }

  // ─── Eliminar (desactivar) ───────────────────────────────────────────────
  const eliminar = async () => {
    if (!confirmEliminar) return
    await api.delete(`/users/${confirmEliminar.id}`)
    setConfirmEliminar(null)
    cargar()
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">👥 Gestión de Usuarios</h1>
        <button
          onClick={abrirCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">⏳ Cargando usuarios...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Contraseña</th>
                <th className="px-4 py-3 text-left">Registrado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay usuarios registrados</td></tr>
              ) : usuarios.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-400">{u.id}</td>

                  <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>

                  <td className="px-4 py-3 text-gray-600">{u.email}</td>

                  {/* Selector de rol rápido */}
                  <td className="px-4 py-3">
                    <select
                      value={u.rol}
                      onChange={e => cambiarRol(u.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${rolBadge[u.rol]}`}
                    >
                      <option value="admin">admin</option>
                      <option value="empleado">empleado</option>
                      <option value="cliente">cliente</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${fuerzaBadge[u.fuerza_password]}`}>
                      {u.fuerza_password}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('es-BO')}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        title="Editar"
                      >✏️</button>
                      <button
                        onClick={() => setConfirmEliminar(u)}
                        className="text-red-500 hover:text-red-700 font-medium"
                        title="Desactivar"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Crear / Editar ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

            <h2 className="text-xl font-bold text-blue-800 mb-4">
              {editando ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
            </h2>

            <div className="space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Ana Quispe"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nombre ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Contraseña con barra de fortaleza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editando && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editando ? '••••••••' : 'Mínimo 6 caracteres'}
                    className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Barra de fortaleza — se muestra solo si el usuario está escribiendo */}
                {form.password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= fuerza.puntos ? fuerza.barColor : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs font-medium ${fuerza.color}`}>
                        Contraseña {fuerza.etiqueta}
                      </span>
                      <span className="text-xs text-gray-400">
                        Necesitas: mayúsc · número · símbolo (!@#$)
                      </span>
                    </div>
                  </div>
                )}
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  name="rol"
                  value={form.rol}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cliente">👤 Cliente</option>
                  <option value="empleado">🧑‍💼 Empleado</option>
                  <option value="admin">🔑 Administrador</option>
                </select>

                {/* Descripción del rol seleccionado */}
                <p className="text-xs text-gray-400 mt-1">
                  {form.rol === 'admin'    && '⚠️ Acceso completo al sistema'}
                  {form.rol === 'empleado' && '✅ Puede gestionar pedidos y productos'}
                  {form.rol === 'cliente'  && '📦 Solo puede ver catálogo y hacer pedidos'}
                </p>
              </div>

            </div>

            {/* Botones del modal */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {saving ? '⏳ Guardando...' : (editando ? '💾 Actualizar' : '✅ Crear Usuario')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación ──────────────────────────────────── */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">¿Desactivar usuario?</h2>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-medium text-gray-700">{confirmEliminar.nombre}</span> no podrá
              iniciar sesión. Esta acción se puede revertir desde la base de datos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEliminar(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                🗑️ Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
