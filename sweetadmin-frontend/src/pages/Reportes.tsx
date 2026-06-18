import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Estadisticas {
  totalProductos: number
  totalPedidos: number
  totalVentas: number
  productosAgotados: number
  pedidosPorEstado: {
    pendiente: number
    en_proceso: number
    listo: number
    entregado: number
    cancelado: number
  }
  productosStockBajo: { id: number; nombre: string; stock: number; categoria: string }[]
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'rango'

// ─── Icono de descarga ────────────────────────────────────────────────────────
const IconoDescarga = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
)

// ─── Helper descarga PDF ──────────────────────────────────────────────────────
async function descargarPdf(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = blobUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Reportes() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Filtros ventas
  const [ventasDesde, setVentasDesde] = useState('')
  const [ventasHasta, setVentasHasta] = useState('')

  // Filtros productos vendidos
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [rangoDesde, setRangoDesde] = useState('')
  const [rangoHasta, setRangoHasta] = useState('')

  // Boleta
  const [pedidoId, setPedidoId] = useState('')

  useEffect(() => {
    api.get('/reportes/estadisticas')
      .then(res => setStats(res.data))
      .catch(() => toast.error('No se pudieron cargar las estadísticas'))
      .finally(() => setLoadingStats(false))
  }, [])

  const ocupado = loadingId !== null

  // ─── Descarga reporte de ventas ───────────────────────────────────────────
  const descargarVentas = async () => {
    setLoadingId('ventas')
    const toastId = toast.loading('Generando Reporte de Ventas...')
    try {
      let url = '/reportes/ventas/pdf'
      if (ventasDesde && ventasHasta) url += `?desde=${ventasDesde}&hasta=${ventasHasta}`
      await descargarPdf(url, 'reporte-ventas.pdf')
      toast.success('Reporte de Ventas descargado', { id: toastId })
    } catch {
      toast.error('Error al generar el reporte', { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  // ─── Descarga productos vendidos ─────────────────────────────────────────
  const descargarProductos = async () => {
    if (periodo === 'rango' && (!rangoDesde || !rangoHasta)) {
      toast.error('Selecciona las fechas del rango')
      return
    }
    setLoadingId('productos')
    const toastId = toast.loading('Generando Productos más Vendidos...')
    try {
      let url = `/reportes/productos-vendidos/pdf?periodo=${periodo}`
      if (periodo === 'rango') url += `&desde=${rangoDesde}&hasta=${rangoHasta}`
      await descargarPdf(url, `reporte-productos-${periodo}.pdf`)
      toast.success('Reporte descargado', { id: toastId })
    } catch {
      toast.error('Error al generar el reporte', { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  // ─── Descarga stock ───────────────────────────────────────────────────────
  const descargarStock = async () => {
    setLoadingId('stock')
    const toastId = toast.loading('Generando Estado del Inventario...')
    try {
      await descargarPdf('/reportes/stock/pdf', 'reporte-stock.pdf')
      toast.success('Reporte de Stock descargado', { id: toastId })
    } catch {
      toast.error('Error al generar el reporte', { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  // ─── Descarga boleta ──────────────────────────────────────────────────────
  const descargarBoleta = async () => {
    const id = pedidoId.trim()
    if (!id || isNaN(Number(id))) { toast.error('Ingresa un número de pedido válido'); return }
    setLoadingId('boleta')
    const toastId = toast.loading(`Generando boleta del pedido #${id}...`)
    try {
      await descargarPdf(`/reportes/pedido/${id}/pdf`, `boleta-pedido-${id}.pdf`)
      toast.success(`Boleta #${id} descargada`, { id: toastId })
    } catch (err: any) {
      const msg = err?.response?.status === 404 ? `Pedido #${id} no encontrado` : 'Error al generar la boleta'
      toast.error(msg, { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = stats ? [
    { label: 'Total vendido',        valor: `Bs. ${Number(stats.totalVentas).toFixed(2)}`, sub: 'solo pedidos entregados', border: 'border-amber-400',  text: 'text-amber-700' },
    { label: 'Pedidos registrados',  valor: stats.totalPedidos,   sub: `${stats.pedidosPorEstado.entregado} entregados`,  border: 'border-blue-400',   text: 'text-blue-700' },
    { label: 'Productos activos',    valor: stats.totalProductos, sub: `${stats.productosAgotados} agotados`,             border: 'border-emerald-400', text: 'text-emerald-700' },
    { label: 'Stock crítico',        valor: stats.productosStockBajo.length, sub: 'menos de 5 unidades',                  border: 'border-red-400',    text: 'text-red-600' },
  ] : []

  const periodos: { key: Periodo; label: string }[] = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Este mes' },
    { key: 'rango',  label: 'Rango' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📄</span>
          <h1 className="text-2xl font-bold text-gray-800">Centro de Reportes</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">
          Genera reportes PDF en tiempo real con datos actualizados de HANDALZ.
        </p>
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((k, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm border-l-4 ${k.border} px-5 py-4`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.text}`}>{k.valor}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerta stock bajo */}
      {stats && stats.productosStockBajo.length > 0 && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span>⚠️</span>
            <p className="text-sm font-semibold text-red-700">
              {stats.productosStockBajo.length} producto(s) con stock crítico
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.productosStockBajo.map(p => (
              <span key={p.id} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
                {p.nombre} — {p.stock} ud.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── TARJETAS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        {/* Reporte de Ventas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-amber-50 rounded-xl p-2">💰</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-amber-700">Reporte de Ventas</h2>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Más usado</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Historial completo de pedidos con totales y estados.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 flex-1">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">Incluye</p>
            <ul className="space-y-1.5">
              {['Resumen por estado (pendiente, en proceso…)', 'Total general de ventas entregadas en Bs.', 'Total de descuentos otorgados', 'Detalle: cliente, tipo de entrega, subtotal y total', 'Filtrable por rango de fechas'].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-emerald-400 mt-0.5 shrink-0 font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          {/* Filtro fechas */}
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-400 mb-2">Filtrar por período (opcional)</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Desde</label>
                <input type="date" value={ventasDesde} onChange={e => setVentasDesde(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Hasta</label>
                <input type="date" value={ventasHasta} onChange={e => setVentasHasta(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300" />
              </div>
              {(ventasDesde || ventasHasta) && (
                <button onClick={() => { setVentasDesde(''); setVentasHasta('') }}
                  className="self-end text-xs text-gray-400 hover:text-gray-600 pb-1.5">✕</button>
              )}
            </div>
          </div>
          <div className="px-5 pb-5 pt-2">
            <button onClick={descargarVentas} disabled={ocupado}
              className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all
                ${loadingId === 'ventas' ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : ocupado ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 text-white shadow-sm active:scale-95'}`}>
              {loadingId === 'ventas' ? <><Spinner />Generando PDF...</> : <><IconoDescarga />Descargar PDF</>}
            </button>
          </div>
        </div>

        {/* Productos más Vendidos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-blue-50 rounded-xl p-2">🏆</span>
              <div>
                <h2 className="font-bold text-sm text-blue-700">Productos más Vendidos</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ranking por unidades vendidas en el período.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 flex-1">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">Incluye</p>
            <ul className="space-y-1.5">
              {['Ranking completo por unidades vendidas', 'Porcentaje de participación de cada producto', 'Ingresos generados por producto', 'Top 3 productos destacados visualmente', 'Filtrable por día, semana, mes o rango'].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-emerald-400 mt-0.5 shrink-0 font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* Selector de periodo */}
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-400 mb-2">Seleccionar período</p>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {periodos.map(p => (
                <button key={p.key} onClick={() => setPeriodo(p.key)}
                  className={`text-xs py-1.5 rounded-lg font-medium transition-all
                    ${periodo === p.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Rango de fechas solo si se selecciona "Rango" */}
            {periodo === 'rango' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Desde</label>
                  <input type="date" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Hasta</label>
                  <input type="date" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300" />
                </div>
              </div>
            )}

            {/* Etiqueta del periodo seleccionado */}
            {periodo !== 'rango' && (
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-600 font-medium">
                  {periodo === 'hoy' && `📅 Hoy: ${new Date().toLocaleDateString('es-BO')}`}
                  {periodo === 'semana' && '📅 Esta semana (lunes a hoy)'}
                  {periodo === 'mes' && `📅 ${new Date().toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}`}
                </p>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 pt-2">
            <button onClick={descargarProductos} disabled={ocupado}
              className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all
                ${loadingId === 'productos' ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : ocupado ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 text-white shadow-sm active:scale-95'}`}>
              {loadingId === 'productos' ? <><Spinner />Generando PDF...</> : <><IconoDescarga />Descargar PDF</>}
            </button>
          </div>
        </div>

        {/* Estado del Inventario */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-emerald-50 rounded-xl p-2">📦</span>
              <div>
                <h2 className="font-bold text-sm text-emerald-700">Estado del Inventario</h2>
                <p className="text-xs text-gray-400 mt-0.5">Inventario completo con alertas de stock crítico.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 flex-1">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">Incluye</p>
            <ul className="space-y-1.5">
              {['Resumen: agotados, críticos y con stock suficiente', 'Valor total del inventario en Bs.', 'Semáforo de stock (OK / BAJO / CRÍTICO / AGOTADO)', 'Precio unitario y valor total por producto', 'Ordenado por stock de menor a mayor'].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-emerald-400 mt-0.5 shrink-0 font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 pb-5 pt-2">
            <button onClick={descargarStock} disabled={ocupado}
              className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all
                ${loadingId === 'stock' ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : ocupado ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 text-white shadow-sm active:scale-95'}`}>
              {loadingId === 'stock' ? <><Spinner />Generando PDF...</> : <><IconoDescarga />Descargar PDF</>}
            </button>
          </div>
        </div>
      </div>

      {/* Boleta individual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl bg-purple-50 rounded-xl p-2">🧾</span>
          <div>
            <h2 className="font-bold text-sm text-purple-700">Boleta de Pedido</h2>
            <p className="text-xs text-gray-400 mt-0.5">Comprobante PDF individual con detalle de productos y totales.</p>
          </div>
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Número de pedido</label>
            <input type="number" min="1" placeholder="Ej: 12" value={pedidoId}
              onChange={e => setPedidoId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && descargarBoleta()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all" />
            <p className="text-xs text-gray-400 mt-1">Puedes ver los IDs en la sección Pedidos.</p>
          </div>
          <button onClick={descargarBoleta} disabled={ocupado || !pedidoId.trim()}
            className={`flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all whitespace-nowrap
              ${loadingId === 'boleta' ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : !pedidoId.trim() || ocupado ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm active:scale-95'}`}>
            {loadingId === 'boleta' ? <><Spinner />Generando...</> : <><IconoDescarga />Descargar Boleta</>}
          </button>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-3 px-5 py-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-gray-400 mt-0.5 shrink-0">ℹ️</span>
        <p className="text-xs text-gray-500 leading-relaxed">
          Los reportes se generan en tiempo real desde la base de datos e incluyen solo registros activos.
          Los PDFs están optimizados para impresión en A4 (A5 para boletas) con el encabezado de{' '}
          <span className="font-semibold text-gray-600">HANDALZ</span> y pie de página en cada hoja.
        </p>
      </div>

    </div>
  )
}
