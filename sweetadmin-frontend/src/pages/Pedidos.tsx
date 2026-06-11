import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Producto {
  id: number
  nombre: string
  precio: number
  stock: number
  categoria?: { nombre: string }
}

interface ClienteRegistrado {
  id: number
  nombre: string
  email: string
}

interface DetallePedido {
  productoId: number
  nombreProducto: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface Pedido {
  id: number
  total: number
  subtotal: number
  descuento: number
  porcentajeDescuento: number
  anticipo: number
  estado: string
  tipoEntrega: string
  fecha: string
  cliente?: { nombre: string; email: string }
  clienteNombre?: string
  clienteTelefono?: string
  detalles: {
    productoId: number
    cantidad: number
    precioUnitario: number
    subtotal: number
    producto: Producto
  }[]
}

// ─── Helper numérico (evita NaN cuando el backend devuelve null/string) ───────
const bs = (val: any): string => {
  const n = parseFloat(val)
  return isNaN(n) ? 'Bs. 0.00' : `Bs. ${n.toFixed(2)}`
}
const num = (val: any): number => {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']

const colorEstado: Record<string, { bg: string; dot: string; label: string }> = {
  pendiente:  { bg: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-400',  label: 'Pendiente'   },
  en_proceso: { bg: 'bg-blue-50 text-blue-700 border border-blue-200',      dot: 'bg-blue-500',   label: 'En proceso'  },
  listo:      { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', label: 'Listo'  },
  entregado:  { bg: 'bg-gray-100 text-gray-600 border border-gray-200',     dot: 'bg-gray-400',   label: 'Entregado'   },
  cancelado:  { bg: 'bg-red-50 text-red-600 border border-red-200',         dot: 'bg-red-400',    label: 'Cancelado'   },
}

const DESCUENTOS = [
  { minimo: 500, porcentaje: 15, label: 'Bs. 500+' },
  { minimo: 200, porcentaje: 10, label: 'Bs. 200+' },
  { minimo: 100, porcentaje: 5,  label: 'Bs. 100+' },
]

function calcularDescuento(subtotal: number, esRegistrado: boolean) {
  if (!esRegistrado) return 0
  if (subtotal >= 500) return 15
  if (subtotal >= 200) return 10
  if (subtotal >= 100) return 5
  return 0
}

function siguienteDescuento(subtotal: number) {
  const siguiente = DESCUENTOS.find(d => subtotal < d.minimo)
  if (!siguiente) return null
  return { falta: siguiente.minimo - subtotal, porcentaje: siguiente.porcentaje, minimo: siguiente.minimo }
}

// ─── Componente Badge de estado ───────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const c = colorEstado[estado] ?? colorEstado.pendiente
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Pedidos() {
  const { user } = useAuth()
  const esAdmin    = user?.rol === 'admin'
  const esEmpleado = user?.rol === 'empleado'
  const esCliente  = user?.rol === 'cliente'

  const [pedidos, setPedidos]       = useState<Pedido[]>([])
  const [productos, setProductos]   = useState<Producto[]>([])
  const [clientes, setClientes]     = useState<ClienteRegistrado[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [exito, setExito]           = useState('')
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null)

  // ─── Estado del formulario ────────────────────────────────────────────────
  const [tipoCliente, setTipoCliente]       = useState<'presencial' | 'registrado'>('presencial')
  const [clienteNombre, setClienteNombre]   = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteIdSel, setClienteIdSel]     = useState<number | null>(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [tipoEntrega, setTipoEntrega]       = useState<'presencial' | 'delivery'>('presencial')
  const [carrito, setCarrito]               = useState<DetallePedido[]>([])
  const [productoSel, setProductoSel]       = useState('')
  const [cantidad, setCantidad]             = useState(1)
  const [saving, setSaving]                 = useState(false)

  // ─── Cálculos en tiempo real ──────────────────────────────────────────────
  const subtotalCalc    = carrito.reduce((s, i) => s + i.subtotal, 0)
  const esRegistrado    = esCliente || tipoCliente === 'registrado'
  const pctDescuento    = calcularDescuento(subtotalCalc, esRegistrado)
  const montoDescuento  = (subtotalCalc * pctDescuento) / 100
  const totalCalc       = subtotalCalc - montoDescuento
  const anticipoCalc    = tipoEntrega === 'delivery' ? totalCalc * 0.5 : 0
  const proxDescuento   = esRegistrado ? siguienteDescuento(subtotalCalc) : null

  // ─── Clientes filtrados por búsqueda ─────────────────────────────────────
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    c.email.toLowerCase().includes(busquedaCliente.toLowerCase())
  )

  const cargar = () => {
    setLoading(true)
    api.get('/pedidos')
      .then(r => setPedidos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    api.get('/productos').then(r => setProductos(r.data)).catch(console.error)
    // Cargar usuarios con rol cliente para el selector
    api.get('/users?rol=cliente').then(r => setClientes(r.data)).catch(() => {
      // fallback: cargar todos y filtrar
      api.get('/users').then(r => {
        const todos = r.data
        setClientes(Array.isArray(todos) ? todos.filter((u: any) => u.rol === 'cliente') : [])
      }).catch(console.error)
    })
  }, [])

  const abrirModal = () => {
    setShowModal(true)
    setCarrito([])
    setClienteNombre('')
    setClienteTelefono('')
    setClienteIdSel(null)
    setBusquedaCliente('')
    setTipoCliente('presencial')
    setTipoEntrega('presencial')
    setProductoSel('')
    setCantidad(1)
  }

  // ─── Carrito ──────────────────────────────────────────────────────────────
  const agregarAlCarrito = () => {
    const prod = productos.find(p => p.id === +productoSel)
    if (!prod) return

    const cantActual = carrito.find(i => i.productoId === prod.id)?.cantidad ?? 0
    const disponible = prod.stock - cantActual

    if (cantidad < 1) {
      toast.error('La cantidad debe ser al menos 1')
      return
    }
    if (disponible <= 0) {
      toast.error(`Sin stock disponible para "${prod.nombre}"`)
      return
    }
    if (cantidad > disponible) {
      toast.error(`Solo quedan ${disponible} unidades de "${prod.nombre}"`)
      return
    }

    const existe = carrito.find(i => i.productoId === prod.id)
    if (existe) {
      setCarrito(carrito.map(i => i.productoId === prod.id
        ? { ...i, cantidad: i.cantidad + cantidad, subtotal: (i.cantidad + cantidad) * i.precioUnitario }
        : i
      ))
    } else {
      setCarrito([...carrito, {
        productoId: prod.id,
        nombreProducto: prod.nombre,
        cantidad,
        precioUnitario: prod.precio,
        subtotal: prod.precio * cantidad,
      }])
    }

    if (prod.stock - cantidad <= 5) {
      toast('⚠️ Stock bajo: quedan ' + (prod.stock - cantidad) + ' unidades de "' + prod.nombre + '"', {
        style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
        icon: '📦',
        duration: 5000,
      })
    }

    setProductoSel('')
    setCantidad(1)
  }

  const quitarDelCarrito = (productoId: number) =>
    setCarrito(carrito.filter(i => i.productoId !== productoId))

  const actualizarCantidad = (productoId: number, nuevaCantidad: number) => {
    const prod = productos.find(p => p.id === productoId)
    if (!prod || nuevaCantidad < 1 || nuevaCantidad > prod.stock) return
    setCarrito(carrito.map(i => i.productoId === productoId
      ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precioUnitario }
      : i
    ))
  }

  // ─── Crear pedido ─────────────────────────────────────────────────────────
  const guardarPedido = async () => {
    if (carrito.length === 0) {
      toast.error('Agrega al menos un producto al pedido')
      return
    }
    if (!esCliente) {
      if (tipoCliente === 'presencial' && !clienteNombre.trim()) {
        toast.error('Ingresa el nombre del cliente presencial')
        return
      }
      if (tipoCliente === 'registrado' && !clienteIdSel) {
        toast.error('Selecciona un cliente registrado')
        return
      }
    }

    setSaving(true)
    try {
      const body: any = {
        tipoEntrega,
        detalles: carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      }

      if (esCliente) {
        // El controller asigna clienteId desde el token JWT automáticamente
      } else if (tipoCliente === 'registrado') {
        body.clienteId = clienteIdSel
      } else {
        body.clienteNombre   = clienteNombre.trim()
        body.clienteTelefono = clienteTelefono.trim()
      }

      await api.post('/pedidos', body)
      toast.success('Pedido registrado correctamente')
      setShowModal(false)
      cargar()
    } catch (err: any) {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(' · ') : msg || 'Error al crear pedido')
    } finally {
      setSaving(false)
    }
  }

  const handleCambiarEstado = async (id: number, estado: string) => {
    await api.put(`/pedidos/${id}/estado`, { estado })
    cargar()
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Cancelar este pedido? Se restaurará el stock.')) return
    await api.delete(`/pedidos/${id}`)
    toast.success('Pedido cancelado — stock restaurado')
    cargar()
  }

  const nombreCliente = (p: Pedido) =>
    p.cliente?.nombre ?? p.clienteNombre ?? 'Sin nombre'

  const clienteSeleccionado = clientes.find(c => c.id === clienteIdSel)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pedidos.length} pedidos registrados</p>
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm transition-colors">
          <span className="text-base">＋</span> Nuevo Pedido
        </button>
      </div>

      {/* Tabla de pedidos */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">⏳</div>
          <p>Cargando pedidos...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3.5 text-left font-medium text-gray-300 text-xs uppercase tracking-wide">ID</th>
                  <th className="px-4 py-3.5 text-left font-medium text-gray-300 text-xs uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3.5 text-left font-medium text-gray-300 text-xs uppercase tracking-wide">Productos</th>
                  <th className="px-4 py-3.5 text-right font-medium text-gray-300 text-xs uppercase tracking-wide">Subtotal</th>
                  <th className="px-4 py-3.5 text-right font-medium text-gray-300 text-xs uppercase tracking-wide">Descuento</th>
                  <th className="px-4 py-3.5 text-right font-medium text-gray-300 text-xs uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3.5 text-right font-medium text-gray-300 text-xs uppercase tracking-wide">Anticipo</th>
                  <th className="px-4 py-3.5 text-center font-medium text-gray-300 text-xs uppercase tracking-wide">Entrega</th>
                  <th className="px-4 py-3.5 text-center font-medium text-gray-300 text-xs uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3.5 text-left font-medium text-gray-300 text-xs uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3.5 text-center font-medium text-gray-300 text-xs uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-gray-400">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="font-medium">No hay pedidos todavía</p>
                      <p className="text-xs mt-1">Crea el primero con el botón "Nuevo Pedido"</p>
                    </td>
                  </tr>
                ) : pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-gray-400 text-xs">#{p.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{nombreCliente(p)}</p>
                      {p.cliente?.email && (
                        <p className="text-xs text-blue-500 mt-0.5">{p.cliente.email}</p>
                      )}
                      {p.clienteTelefono && (
                        <p className="text-xs text-gray-400 mt-0.5">📞 {p.clienteTelefono}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {p.detalles?.map(d => (
                          <div key={d.productoId} className="text-xs text-gray-600">
                            <span className="font-medium text-gray-800">{d.cantidad}×</span> {d.producto?.nombre}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                      {bs(p.subtotal)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {num(p.porcentajeDescuento) > 0 ? (
                        <div>
                          <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-1.5 py-0.5 rounded">
                            -{p.porcentajeDescuento}%
                          </span>
                          <p className="text-xs text-emerald-600 mt-0.5 tabular-nums">
                            -{bs(p.descuento)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 tabular-nums">
                      {bs(p.total)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {num(p.anticipo) > 0 ? (
                        <span className="text-orange-600 font-medium text-xs">
                          {bs(p.anticipo)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        p.tipoEntrega === 'delivery'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.tipoEntrega === 'delivery' ? '🛵 Delivery' : '🏪 Presencial'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {(esAdmin || esEmpleado) ? (
                        <select
                          value={p.estado}
                          onChange={e => handleCambiarEstado(p.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-0 outline-none ${colorEstado[p.estado]?.bg ?? ''}`}
                        >
                          {ESTADOS.map(est => (
                            <option key={est} value={est}>{colorEstado[est]?.label ?? est}</option>
                          ))}
                        </select>
                      ) : (
                        <EstadoBadge estado={p.estado} />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(p.fecha).toLocaleDateString('es-BO', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPedidoDetalle(p)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium hover:underline"
                        >
                          Ver
                        </button>
                        {p.estado !== 'cancelado' && p.estado !== 'entregado' && (esAdmin || esEmpleado) && (
                          <button
                            onClick={() => handleEliminar(p.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — NUEVO PEDIDO
      ════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuevo Pedido</h2>
                <p className="text-xs text-gray-400 mt-0.5">Completa los datos y agrega productos</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors">
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Sección 1: Tipo de cliente ── */}
              {!esCliente && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    1 · Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(['presencial', 'registrado'] as const).map(t => (
                      <button key={t} onClick={() => { setTipoCliente(t); setClienteIdSel(null); setBusquedaCliente('') }}
                        className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          tipoCliente === t
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                        {t === 'presencial' ? '🏪 Cliente presencial' : '👤 Cliente registrado'}
                      </button>
                    ))}
                  </div>

                  {/* Datos cliente presencial */}
                  {tipoCliente === 'presencial' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Nombre <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={clienteNombre}
                          onChange={e => setClienteNombre(e.target.value)}
                          placeholder="Ej: Doña Rosa"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono</label>
                        <input
                          value={clienteTelefono}
                          onChange={e => setClienteTelefono(e.target.value)}
                          placeholder="Ej: 70012345"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Selector de cliente registrado */}
                  {tipoCliente === 'registrado' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Buscar cliente <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={busquedaCliente}
                        onChange={e => setBusquedaCliente(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />

                      {/* Lista de clientes filtrados */}
                      {busquedaCliente && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-44 overflow-y-auto">
                          {clientesFiltrados.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400 text-center">
                              Sin resultados para "{busquedaCliente}"
                            </p>
                          ) : clientesFiltrados.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setClienteIdSel(c.id); setBusquedaCliente('') }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                                clienteIdSel === c.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                {c.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{c.nombre}</p>
                                <p className="text-xs text-gray-400">{c.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Cliente seleccionado */}
                      {clienteSeleccionado && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {clienteSeleccionado.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900 text-sm">{clienteSeleccionado.nombre}</p>
                            <p className="text-xs text-blue-600">{clienteSeleccionado.email}</p>
                          </div>
                          <button
                            onClick={() => setClienteIdSel(null)}
                            className="text-blue-400 hover:text-blue-600 text-lg leading-none"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      {/* Info de descuentos para cliente registrado */}
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-1">
                        <p className="text-xs font-semibold text-amber-700 mb-1.5">🎉 Descuentos por fidelidad</p>
                        <div className="flex gap-3">
                          {DESCUENTOS.map(d => (
                            <div key={d.minimo} className="text-center">
                              <span className="block text-sm font-bold text-amber-800">{d.porcentaje}%</span>
                              <span className="block text-xs text-amber-600">desde {d.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Banner si es el propio cliente logueado */}
              {esCliente && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {user?.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{user?.nombre}</p>
                    <p className="text-xs text-blue-600">Aplica descuento si tu compra supera Bs. 100</p>
                  </div>
                </div>
              )}

              {/* ── Sección 2: Tipo de entrega ── */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {!esCliente ? '2 · Entrega' : '1 · Entrega'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['presencial', 'delivery'] as const).map(t => (
                    <button key={t} onClick={() => setTipoEntrega(t)}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        tipoEntrega === t
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      {t === 'presencial' ? '🏪 Pasa a recoger' : '🛵 Delivery · 50% anticipo'}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Sección 3: Productos ── */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {!esCliente ? '3 · Productos' : '2 · Productos'}
                </h3>

                <div className="flex gap-2 mb-2">
                  <select
                    value={productoSel}
                    onChange={e => { setProductoSel(e.target.value); setCantidad(1) }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.filter(p => p.stock > 0).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · Bs. {Number(p.precio).toFixed(2)} · {p.stock <= 5 ? `⚠️ solo ${p.stock}` : `stock: ${p.stock}`}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number" min={1}
                    max={productos.find(p => p.id === +productoSel)?.stock ?? 99}
                    value={cantidad}
                    onChange={e => setCantidad(Math.max(1, +e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    onClick={agregarAlCarrito}
                    disabled={!productoSel}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Agregar
                  </button>
                </div>

                {/* Indicador de stock del producto seleccionado */}
                {productoSel && (() => {
                  const prod = productos.find(p => p.id === +productoSel)
                  const cantActual = carrito.find(i => i.productoId === +productoSel)?.cantidad ?? 0
                  const disponible = (prod?.stock ?? 0) - cantActual
                  if (!prod) return null
                  return (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-3 ${
                      disponible <= 0
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : disponible <= 5
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      <span>{disponible <= 0 ? '🚫' : disponible <= 5 ? '⚠️' : '📦'}</span>
                      <span>
                        {disponible <= 0
                          ? `Sin stock disponible para "${prod.nombre}"`
                          : cantActual > 0
                          ? `Disponible: ${disponible} unidades (${cantActual} ya en carrito)`
                          : `Disponible: ${disponible} unidades`
                        }
                      </span>
                    </div>
                  )
                })()}

                {/* Carrito vacío */}
                {carrito.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center text-gray-400">
                    <p className="text-2xl mb-1">🛒</p>
                    <p className="text-sm">Sin productos aún</p>
                  </div>
                )}

                {/* Tabla del carrito */}
                {carrito.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Producto</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Cant.</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Precio</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {carrito.map(item => (
                          <tr key={item.productoId}>
                            <td className="px-3 py-2.5 font-medium text-gray-800">{item.nombreProducto}</td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-colors"
                                >−</button>
                                <span className="w-8 text-center text-sm tabular-nums">{item.cantidad}</span>
                                <button
                                  onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-colors"
                                >+</button>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">
                              {bs(item.precioUnitario)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                              {bs(item.subtotal)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => quitarDelCarrito(item.productoId)}
                                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 text-sm leading-none transition-colors"
                              >×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Resumen de totales */}
                    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span className="tabular-nums">Bs. {subtotalCalc.toFixed(2)}</span>
                      </div>

                      {pctDescuento > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-medium">
                          <span>🎉 Descuento {pctDescuento}%</span>
                          <span className="tabular-nums">− Bs. {montoDescuento.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Barra de progreso hacia siguiente descuento */}
                      {esRegistrado && proxDescuento && (
                        <div className="pt-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Faltan Bs. {proxDescuento.falta.toFixed(2)} para {proxDescuento.porcentaje}% de descuento</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (subtotalCalc / proxDescuento.minimo) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total</span>
                        <span className="tabular-nums">Bs. {totalCalc.toFixed(2)}</span>
                      </div>

                      {tipoEntrega === 'delivery' && (
                        <div className="flex justify-between text-sm text-orange-600 font-semibold">
                          <span>🛵 Anticipo (50%)</span>
                          <span className="tabular-nums">Bs. {anticipoCalc.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Footer del modal */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPedido}
                disabled={saving || carrito.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {saving ? 'Guardando...' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL — DETALLE DEL PEDIDO
      ════════════════════════════════════════════════════════════════════ */}
      {pedidoDetalle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pedido #{pedidoDetalle.id}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(pedidoDetalle.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setPedidoDetalle(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Cliente */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {nombreCliente(pedidoDetalle).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{nombreCliente(pedidoDetalle)}</p>
                  {pedidoDetalle.cliente?.email && (
                    <p className="text-xs text-blue-500">{pedidoDetalle.cliente.email}</p>
                  )}
                  {pedidoDetalle.clienteTelefono && (
                    <p className="text-xs text-gray-400">📞 {pedidoDetalle.clienteTelefono}</p>
                  )}
                </div>
                <div className="ml-auto">
                  <EstadoBadge estado={pedidoDetalle.estado} />
                </div>
              </div>

              {/* Productos */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Productos</p>
                <div className="space-y-1.5">
                  {pedidoDetalle.detalles?.map(d => (
                    <div key={d.productoId} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">
                        <span className="font-semibold text-gray-900">{d.cantidad}×</span> {d.producto?.nombre}
                      </span>
                      <span className="tabular-nums text-gray-600">{bs(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{ bs(pedidoDetalle.subtotal)}</span>
                </div>
                {num(pedidoDetalle.porcentajeDescuento) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Descuento ({pedidoDetalle.porcentajeDescuento}%)</span>
                    <span className="tabular-nums">− {bs(pedidoDetalle.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span className="tabular-nums">{bs(pedidoDetalle.total)}</span>
                </div>
                {num(pedidoDetalle.anticipo) > 0 && (
                  <div className="flex justify-between text-sm text-orange-600 font-medium">
                    <span>🛵 Anticipo pagado</span>
                    <span className="tabular-nums">{bs(pedidoDetalle.anticipo)}</span>
                  </div>
                )}
              </div>

              {/* Entrega */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5">
                <span>{pedidoDetalle.tipoEntrega === 'delivery' ? '🛵' : '🏪'}</span>
                <span className="font-medium">
                  {pedidoDetalle.tipoEntrega === 'delivery' ? 'Delivery' : 'Pasa a recoger'}
                </span>
              </div>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setPedidoDetalle(null)}
                className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}