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

interface ReporteConfig {
  id: string
  titulo: string
  descripcion: string
  icono: string
  endpoint: string
  filename: string
  contenido: string[]
  accentColor: string
  borderColor: string
  iconBg: string
  badge?: string
}

// ─── Configuracion de reportes ────────────────────────────────────────────────
const REPORTES: ReporteConfig[] = [
  {
    id: 'ventas',
    titulo: 'Reporte de Ventas',
    descripcion: 'Historial completo de pedidos con totales, descuentos y resumen por estado.',
    icono: '💰',
    endpoint: '/reportes/ventas/pdf',
    filename: 'reporte-ventas.pdf',
    contenido: [
      'Resumen por estado (pendiente, en proceso, entregado…)',
      'Total general de ventas entregadas en Bs.',
      'Total de descuentos otorgados',
      'Detalle: cliente, tipo de entrega, subtotal, descuento y total',
      'Filtrable por rango de fechas',
    ],
    accentColor: 'text-amber-700',
    borderColor: 'border-amber-400',
    iconBg: 'bg-amber-50',
    badge: 'Más usado',
  },
  {
    id: 'productos',
    titulo: 'Productos más Vendidos',
    descripcion: 'Ranking de productos ordenados por unidades vendidas en pedidos activos.',
    icono: '🏆',
    endpoint: '/reportes/productos-vendidos/pdf',
    filename: 'reporte-productos-vendidos.pdf',
    contenido: [
      'Ranking completo por unidades vendidas',
      'Porcentaje de participación de cada producto',
      'Ingresos generados por producto',
      'Agrupado por categoría',
      'Top 3 productos destacados visualmente',
    ],
    accentColor: 'text-blue-700',
    borderColor: 'border-blue-400',
    iconBg: 'bg-blue-50',
  },
  {
    id: 'stock',
    titulo: 'Estado del Inventario',
    descripcion: 'Inventario completo con alertas de stock crítico y valor total en bodega.',
    icono: '📦',
    endpoint: '/reportes/stock/pdf',
    filename: 'reporte-stock.pdf',
    contenido: [
      'Resumen: agotados, críticos y con stock suficiente',
      'Valor total del inventario en Bs.',
      'Semáforo de stock por producto (OK / BAJO / CRÍTICO / AGOTADO)',
      'Precio unitario y valor total por producto',
      'Ordenado por stock de menor a mayor',
    ],
    accentColor: 'text-emerald-700',
    borderColor: 'border-emerald-400',
    iconBg: 'bg-emerald-50',
  },
]

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Reportes() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Filtros para reporte de ventas
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pedidoId, setPedidoId] = useState('')

  useEffect(() => {
    api.get('/reportes/estadisticas')
      .then(res => setStats(res.data))
      .catch(() => toast.error('No se pudieron cargar las estadísticas'))
      .finally(() => setLoadingStats(false))
  }, [])

  // ─── Descarga genérica ───────────────────────────────────────────────────────
  const descargar = async (reporte: ReporteConfig) => {
    setLoadingId(reporte.id)
    const toastId = toast.loading(`Generando ${reporte.titulo}...`)
    try {
      let url = reporte.endpoint
      if (reporte.id === 'ventas' && (desde || hasta)) {
        const params = new URLSearchParams()
        if (desde) params.append('desde', desde)
        if (hasta) params.append('hasta', hasta)
        url = `${url}?${params.toString()}`
      }
      const res = await api.get(url, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', reporte.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success(`${reporte.titulo} descargado`, { id: toastId })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al generar el reporte'
      toast.error(msg, { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  // ─── Boleta individual ───────────────────────────────────────────────────────
  const descargarBoleta = async () => {
    const id = pedidoId.trim()
    if (!id || isNaN(Number(id))) {
      toast.error('Ingresa un número de pedido válido')
      return
    }
    setLoadingId('boleta')
    const toastId = toast.loading(`Generando boleta del pedido #${id}...`)
    try {
      const res = await api.get(`/reportes/pedido/${id}/pdf`, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', `boleta-pedido-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success(`Boleta del pedido #${id} descargada`, { id: toastId })
    } catch (err: any) {
      const status = err?.response?.status
      const msg = status === 404
        ? `El pedido #${id} no existe o fue cancelado`
        : 'Error al generar la boleta'
      toast.error(msg, { id: toastId })
    } finally {
      setLoadingId(null)
    }
  }

  const ocupado = loadingId !== null

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = stats
    ? [
        {
          label: 'Total vendido',
          valor: `Bs. ${Number(stats.totalVentas).toFixed(2)}`,
          sub: 'solo pedidos entregados',
          color: 'border-amber-400',
          textColor: 'text-amber-700',
        },
        {
          label: 'Pedidos registrados',
          valor: stats.totalPedidos,
          sub: `${stats.pedidosPorEstado.entregado} entregados`,
          color: 'border-blue-400',
          textColor: 'text-blue-700',
        },
        {
          label: 'Productos activos',
          valor: stats.totalProductos,
          sub: `${stats.productosAgotados} agotados`,
          color: 'border-emerald-400',
          textColor: 'text-emerald-700',
        },
        {
          label: 'Stock crítico',
          valor: stats.productosStockBajo.length,
          sub: 'menos de 5 unidades',
          color: 'border-red-400',
          textColor: 'text-red-600',
        },
      ]
    : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ─── Encabezado ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📄</span>
          <h1 className="text-2xl font-bold text-gray-800">Centro de Reportes</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">
          Genera reportes PDF en tiempo real con datos actualizados de HANDALZ.
        </p>
      </div>

      {/* ─── KPIs ───────────────────────────────────────────────────────── */}
      {!loadingStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((k, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm border-l-4 ${k.color} px-5 py-4`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.textColor}`}>{k.valor}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}
      {loadingStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Alertas de stock bajo ──────────────────────────────────────── */}
      {stats && stats.productosStockBajo.length > 0 && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-semibold text-red-700">
              {stats.productosStockBajo.length} producto{stats.productosStockBajo.length > 1 ? 's' : ''} con stock crítico
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.productosStockBajo.map(p => (
              <span key={p.id} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
                {p.nombre} — {p.stock} ud.
              </span>
            ))}
          </div>
          <p className="text-xs text-red-400 mt-2">
            Descarga el reporte de inventario para ver el detalle completo.
          </p>
        </div>
      )}

      {/* ─── Tarjetas de reportes ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {REPORTES.map(reporte => {
          const cargando = loadingId === reporte.id
          return (
            <div
              key={reporte.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className={`border-b border-gray-100 px-5 py-4`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl rounded-xl p-2 ${reporte.iconBg}`}>{reporte.icono}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`font-bold text-sm ${reporte.accentColor}`}>{reporte.titulo}</h2>
                        {reporte.badge && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {reporte.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{reporte.descripcion}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="px-5 py-4 flex-1">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">
                  Incluye
                </p>
                <ul className="space-y-1.5">
                  {reporte.contenido.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-emerald-400 mt-0.5 shrink-0 font-bold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Filtro de fechas solo para ventas */}
              {reporte.id === 'ventas' && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-gray-400 mb-2">Filtrar por período (opcional)</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Desde</label>
                      <input
                        type="date"
                        value={desde}
                        onChange={e => setDesde(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Hasta</label>
                      <input
                        type="date"
                        value={hasta}
                        onChange={e => setHasta(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
                      />
                    </div>
                    {(desde || hasta) && (
                      <button
                        onClick={() => { setDesde(''); setHasta('') }}
                        className="self-end text-xs text-gray-400 hover:text-gray-600 pb-1.5"
                        title="Limpiar fechas"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Botón */}
              <div className="px-5 pb-5 pt-2">
                <button
                  onClick={() => descargar(reporte)}
                  disabled={ocupado}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all
                    ${cargando
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : ocupado
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-800 hover:bg-gray-700 text-white shadow-sm hover:shadow active:scale-95'
                    }`}
                >
                  {cargando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Boleta individual ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl bg-purple-50 rounded-xl p-2">🧾</span>
          <div>
            <h2 className="font-bold text-sm text-purple-700">Boleta de Pedido</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Genera el comprobante PDF de un pedido específico con detalle de productos y totales.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Número de pedido
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ej: 42"
              value={pedidoId}
              onChange={e => setPedidoId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && descargarBoleta()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">
              Puedes ver los IDs de pedidos en la sección Pedidos.
            </p>
          </div>
          <button
            onClick={descargarBoleta}
            disabled={ocupado || !pedidoId.trim()}
            className={`flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all whitespace-nowrap
              ${loadingId === 'boleta'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : !pedidoId.trim() || ocupado
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow active:scale-95'
              }`}
          >
            {loadingId === 'boleta' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Boleta
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Nota informativa ───────────────────────────────────────────── */}
      <div className="mt-6 flex items-start gap-3 px-5 py-4 bg-gray-50 rounded-xl border border-gray-200">
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
