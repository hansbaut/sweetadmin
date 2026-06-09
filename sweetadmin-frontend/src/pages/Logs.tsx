import { useEffect, useState } from 'react'
import api from '../services/api'

interface Log {
  id: number
  ip: string
  evento: string
  browser: string
  fecha_hora: string
  usuario?: { nombre: string; email: string }
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/access-log')
      .then(res => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">🔍 Logs de Acceso</h1>

      {loading ? (
        <p className="text-center text-gray-500 py-8">⏳ Cargando logs...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Usuario</th>
                <th className="px-4 py-3 text-left text-sm">IP</th>
                <th className="px-4 py-3 text-left text-sm">Evento</th>
                <th className="px-4 py-3 text-left text-sm">Navegador</th>
                <th className="px-4 py-3 text-left text-sm">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-800">{log.usuario?.nombre ?? 'Desconocido'}</p>
                    <p className="text-xs text-gray-400">{log.usuario?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.ip}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.evento === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.evento === 'ingreso' ? '🟢 Ingreso' : '🔴 Salida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{log.browser}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(log.fecha_hora).toLocaleString('es-BO')}
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
