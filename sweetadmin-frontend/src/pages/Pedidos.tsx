import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Producto { id: number; nombre: string; precio: number; stock: number; categoria?: { nombre: string } }
interface DetallePedido { productoId: number; nombreProducto: string; cantidad: number; precioUnitario: number; subtotal: number }
interface Pedido {
  id: number; total: number; subtotal: number; descuento: number
  porcentajeDescuento: number; anticipo: number; estado: string
  tipoEntrega: string; fecha: string
  cliente?: { nombre: string }
  clienteNombre?: string; clienteTelefono?: string
  detalles: { productoId: number; cantidad: number; precioUnitario: number; subtotal: number; producto: Producto }[]
}

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']
const colorEstado: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  listo:      'bg-green-100 text-green-700',
  entregado:  'bg-gray-200 text-gray-700',
  cancelado:  'bg-red-100 text-red-700',
}

// ─── Descuento según total (solo usuarios registrados) ────────────────────────
function calcularDescuento(subtotal: number, esRegistrado: boolean) {
  if (!esRegistrado) return 0
  if (subtotal >= 500) return 15
  if (subtotal >= 200) return 10
  if (subtotal >= 100) return 5
  return 0
}

export default function Pedidos() {
  const { user } = useAuth()
  const esAdmin   = user?.rol === 'admin'
  const esEmpleado = user?.rol === 'empleado'
  const esCliente = user?.rol === 'cliente'

  const [pedidos, setPedidos]     = useState<Pedido[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [exito, setExito]         = useState('')

  // ─── Form nuevo pedido ───────────────────────────────────────────────────
  const [tipoCliente, setTipoCliente]     = useState<'registrado' | 'presencial'>('presencial')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [tipoEntrega, setTipoEntrega]     = useState<'presencial' | 'delivery'>('presencial')
  const [carrito, setCarrito]             = useState<DetallePedido[]>([])
  const [productoSel, setProductoSel]     = useState('')
  const [cantidad, setCantidad]           = useState(1)
  const [saving, setSaving]               = useState(false)

  // ─── Cálculos en tiempo real ─────────────────────────────────────────────
  const subtotalCalc  = carrito.reduce((s, i) => s + i.subtotal, 0)
  const esRegistrado  = esCliente || tipoCliente === 'registrado'
  const pctDescuento  = calcularDescuento(subtotalCalc, esRegistrado)
  const montoDescuento = (subtotalCalc * pctDescuento) / 100
  const totalCalc     = subtotalCalc - montoDescuento
  const anticipoCalc  = tipoEntrega === 'delivery' ? totalCalc * 0.5 : 0

  const cargar = () => {
    setLoading(true)
    api.get('/pedidos').then(r => setPedidos(r.data)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => {
    cargar()
    api.get('/productos').then(r => setProductos(r.data)).catch(console.error)
  }, [])

  // ─── Agregar producto al carrito ─────────────────────────────────────────
  const agregarAlCarrito = () => {
    const prod = productos.find(p => p.id === +productoSel)
    if (!prod) return
    if (cantidad < 1 || cantidad > prod.stock) return

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
    setProductoSel(''); setCantidad(1)
  }

  const quitarDelCarrito = (productoId: number) =>
    setCarrito(carrito.filter(i => i.productoId !== productoId))

  // ─── Crear pedido ────────────────────────────────────────────────────────
  const guardarPedido = async () => {
    if (carrito.length === 0) return alert('Agrega al menos un producto')
    if (!esCliente && tipoCliente === 'presencial' && !clienteNombre.trim())
      return alert('Ingresa el nombre del cliente')

    setSaving(true)
    try {
      const body: any = {
        tipoEntrega,
        detalles: carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      }
      if (!esCliente) {
        if (tipoCliente === 'presencial') {
          body.clienteNombre = clienteNombre
          body.clienteTelefono = clienteTelefono
        }
        // si tipoCliente === 'registrado', el backend asigna el clienteId del token
      }

      await api.post('/pedidos', body)
      setExito('✅ Pedido creado correctamente')
      setShowModal(false)
      setCarrito([]); setClienteNombre(''); setClienteTelefono('')
      cargar()
      setTimeout(() => setExito(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear pedido')
    } finally {
      setSaving(false)
    }
  }

  const handleCambiarEstado = async (id: number, estado: string) => {
    await api.put(`/pedidos/${id}/estado`, { estado }); cargar()
  }
  const handleEliminar = async (id: number) => {
    if (!confirm('¿Cancelar este pedido? Se restaurará el stock.')) return
    await api.delete(`/pedidos/${id}`)
    setExito('Pedido cancelado y stock restaurado'); cargar()
    setTimeout(() => setExito(''), 3000)
  }

  const nombreCliente = (p: Pedido) =>
    p.cliente?.nombre ?? p.clienteNombre ?? 'Sin nombre'

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">📦 Gestión de Pedidos</h1>
        <button onClick={() => { setShowModal(true); setCarrito([]) }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
          ➕ Nuevo Pedido
        </button>
      </div>

      {exito && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{exito}</div>}

      {/* ── Tabla de pedidos ─────────────────────────────────────────────── */}
      {loading ? <p className="text-center py-8 text-gray-400">⏳ Cargando...</p> : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Productos</th>
                <th className="px-4 py-3 text-left">Subtotal</th>
                <th className="px-4 py-3 text-left">Descuento</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Anticipo</th>
                <th className="px-4 py-3 text-left">Entrega</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400">No hay pedidos</td></tr>
              ) : pedidos.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-500">#{p.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{nombreCliente(p)}</p>
                    {p.clienteTelefono && <p className="text-xs text-gray-400">📞 {p.clienteTelefono}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                    {p.detalles?.map(d => (
                      <span key={d.productoId} className="block">
                        {d.cantidad}x {d.producto?.nombre}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-gray-600">Bs. {Number(p.subtotal).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {p.porcentajeDescuento > 0
                      ? <span className="text-green-600 font-medium">-{p.porcentajeDescuento}%<br/><span className="text-xs">Bs. {Number(p.descuento).toFixed(2)}</span></span>
                      : <span className="text-gray-400 text-xs">Sin descuento</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-800">Bs. {Number(p.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">
                    {Number(p.anticipo) > 0
                      ? <span className="text-orange-600 font-medium">Bs. {Number(p.anticipo).toFixed(2)}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.tipoEntrega === 'delivery' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.tipoEntrega === 'delivery' ? '🛵 Delivery' : '🏪 Presencial'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(esAdmin || esEmpleado) ? (
                      <select value={p.estado} onChange={e => handleCambiarEstado(p.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${colorEstado[p.estado]}`}>
                        {ESTADOS.map(est => <option key={est} value={est}>{est.replace('_', ' ')}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado[p.estado]}`}>
                        {p.estado.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.fecha).toLocaleDateString('es-BO')}</td>
                  <td className="px-4 py-3 text-center">
                    {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                      <button onClick={() => handleEliminar(p.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">
                        🗑️ Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nuevo Pedido ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4">➕ Nuevo Pedido</h2>

            {/* Tipo de cliente — solo admin/empleado elige */}
            {!esCliente && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cliente</label>
                <div className="flex gap-3">
                  {(['presencial', 'registrado'] as const).map(t => (
                    <button key={t} onClick={() => setTipoCliente(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        tipoCliente === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {t === 'presencial' ? '🏪 Cliente presencial' : '👤 Cliente registrado'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Datos cliente presencial */}
            {!esCliente && tipoCliente === 'presencial' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente *</label>
                  <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                    placeholder="Ej: Doña Rosa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                    placeholder="Ej: 70012345" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            {esCliente && (
              <div className="bg-blue-50 rounded-lg px-4 py-2 mb-4 text-sm text-blue-700">
                👤 Pedido a nombre de <strong>{user?.nombre}</strong> — aplica descuento si tu compra supera Bs. 100
              </div>
            )}

            {/* Tipo de entrega */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de entrega</label>
              <div className="flex gap-3">
                {(['presencial', 'delivery'] as const).map(t => (
                  <button key={t} onClick={() => setTipoEntrega(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      tipoEntrega === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t === 'presencial' ? '🏪 Pasa a recoger' : '🛵 Delivery (paga 50% anticipo)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Agregar productos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Agregar productos</label>
              <div className="flex gap-2">
                <select value={productoSel} onChange={e => setProductoSel(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Selecciona un producto --</option>
                  {productos.filter(p => p.stock > 0).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — Bs. {Number(p.precio).toFixed(2)} (stock: {p.stock})
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={cantidad} onChange={e => setCantidad(+e.target.value)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={agregarAlCarrito} disabled={!productoSel}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  ➕ Agregar
                </button>
              </div>
            </div>

            {/* Carrito */}
            {carrito.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Producto</th>
                      <th className="px-3 py-2 text-center text-gray-600">Cant.</th>
                      <th className="px-3 py-2 text-right text-gray-600">Precio</th>
                      <th className="px-3 py-2 text-right text-gray-600">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map(item => (
                      <tr key={item.productoId} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-800">{item.nombreProducto}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right text-gray-600">Bs. {Number(item.precioUnitario).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-700">Bs. {Number(item.subtotal).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => quitarDelCarrito(item.productoId)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Resumen de totales */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>Bs. {subtotalCalc.toFixed(2)}</span>
                  </div>
                  {pctDescuento > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>🎉 Descuento ({pctDescuento}%) por usuario registrado</span>
                      <span>- Bs. {montoDescuento.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-blue-800 border-t border-gray-200 pt-1">
                    <span>Total</span>
                    <span>Bs. {totalCalc.toFixed(2)}</span>
                  </div>
                  {tipoEntrega === 'delivery' && (
                    <div className="flex justify-between text-sm text-orange-600 font-medium">
                      <span>🛵 Anticipo requerido (50%)</span>
                      <span>Bs. {anticipoCalc.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarPedido} disabled={saving || carrito.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition-colors">
                {saving ? '⏳ Guardando...' : '✅ Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
