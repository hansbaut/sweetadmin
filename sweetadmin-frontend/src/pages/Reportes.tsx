import { useState } from 'react'
import api from '../services/api'

export default function Reportes() {
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState('')

  const descargarPDF = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reportes/ventas/pdf', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'reporte-ventas.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      setExito('PDF descargado correctamente')
      setTimeout(() => setExito(''), 3000)
    } catch {
      console.error('Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">📄 Reportes</h1>

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          ✅ {exito}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Reporte de Ventas</h2>
          <p className="text-gray-500 text-sm mb-4">
            Descarga un PDF con el listado completo de pedidos, totales y estados.
          </p>
          <button
            onClick={descargarPDF}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? '⏳ Generando PDF...' : '⬇️ Descargar PDF'}
          </button>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="text-4xl mb-3">ℹ️</div>
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Sobre los reportes</h2>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>✅ Incluye todos los pedidos activos</li>
            <li>✅ Muestra el total general en Bs.</li>
            <li>✅ Incluye cliente y estado de cada pedido</li>
            <li>✅ Generado en tiempo real desde la base de datos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}