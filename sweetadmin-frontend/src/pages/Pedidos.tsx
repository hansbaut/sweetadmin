import { useEffect, useState } from 'react'
import api from '../services/api'

interface Pedido {
  id: number
  total: number
  estado: string
  fecha: string
  cliente?: { id: number; nombre: string }
}

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']

const colorEstado: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  listo: 'bg-green-100 text-green-700',
  entregado: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [exito, setExito] = useState('')

  const cargar = () => {
    api.get('/pedidos')
      .then(res => setPedidos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async () => {
    try {
      await api.post('/pedidos', { clienteId: 1 })
      setExito('Pedido creado correctamente')
      cargar()
      setTimeout(() => setExito(''), 3000)
    } catch {
      console.error('Error al crear pedido')
    }
  }

  const handleCambiarEstado = async (id: number, estado: string) => {
    await api.put(`/pedidos/${id}/estado`, { estado })
    cargar()
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Cancelar este pedido?')) return
    await api.delete(`/pedidos/${id}`)
    setExito('Pedido cancelado')
    cargar()
    setTimeout(() => setExito(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">📦 Gestión de Pedidos</h1>
        <button
          onClick={handleCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          ➕ Nuevo Pedido
        </button>
      </div>

      {exito && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">✅ {exito}</div>}

      {loading ? (
        <p className="text-center text-gray-500 py-8">⏳ Cargando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-400 text-lg">No hay pedidos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">ID</th>
                <th className="px-4 py-3 text-left text-sm">Cliente</th>
                <th className="px-4 py-3 text-left text-sm">Total</th>
                <th className="px-4 py-3 text-left text-sm">Estado</th>
                <th className="px-4 py-3 text-left text-sm">Fecha</th>
                <th className="px-4 py-3 text-center text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-600">#{p.id}</td>
                  <td className="px-4 py-3 text-gray-800">{p.cliente?.nombre ?? 'Sin cliente'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">Bs. {Number(p.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.estado}
                      onChange={e => handleCambiarEstado(p.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${colorEstado[p.estado]}`}
                    >
                      {ESTADOS.map(est => (
                        <option key={est} value={est}>{est.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(p.fecha).toLocaleDateString('es-BO')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEliminar(p.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      🗑️ Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}