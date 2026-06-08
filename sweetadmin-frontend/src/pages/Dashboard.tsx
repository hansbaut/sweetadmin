import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../services/api'

const COLORS = ['#1F4E79', '#2E75B6', '#70AD47', '#FFC000', '#FF4444']

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reportes/estadisticas')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">⏳ Cargando estadísticas...</p>
    </div>
  )

  const pieData = stats ? [
    { name: 'Pendiente', value: stats.pedidosPorEstado.pendiente },
    { name: 'En proceso', value: stats.pedidosPorEstado.en_proceso },
    { name: 'Listo', value: stats.pedidosPorEstado.listo },
    { name: 'Entregado', value: stats.pedidosPorEstado.entregado },
    { name: 'Cancelado', value: stats.pedidosPorEstado.cancelado },
  ] : []

  const barData = pieData.filter(d => d.value > 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">📊 Dashboard</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-600">
          <p className="text-gray-500 text-sm">Total Productos</p>
          <p className="text-3xl font-bold text-blue-800">{stats?.totalProductos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Total Pedidos</p>
          <p className="text-3xl font-bold text-green-700">{stats?.totalPedidos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">Total Ventas</p>
          <p className="text-3xl font-bold text-yellow-700">Bs. {Number(stats?.totalVentas ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Gráfico de barras */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">📦 Pedidos por Estado</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2E75B6" name="Pedidos" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de torta */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">🥧 Distribución de Pedidos</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Productos con stock bajo */}
      {stats?.productosStockBajo?.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-red-700 mb-3">⚠️ Productos con Stock Bajo</h2>
          <div className="flex flex-wrap gap-2">
            {stats.productosStockBajo.map((p: any) => (
              <span key={p.id} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                {p.nombre} — {p.stock} unidades
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
