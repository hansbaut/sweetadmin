import { useEffect, useState } from 'react'
import api from '../services/api'

interface Producto {
  id: number
  nombre: string
  descripcion?: string
  precio: number
  stock: number
  activo: boolean
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', stock: '' })
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const cargar = () => {
    api.get('/productos')
      .then(res => setProductos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.nombre || !form.precio) {
      setError('Nombre y precio son obligatorios')
      return
    }
    try {
      const datos = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: Number(form.precio),
        stock: Number(form.stock) || 0,
      }
      if (editando) {
        await api.put(`/productos/${editando.id}`, datos)
        setExito('Producto actualizado correctamente')
      } else {
        await api.post('/productos', datos)
        setExito('Producto creado correctamente')
      }
      setForm({ nombre: '', descripcion: '', precio: '', stock: '' })
      setShowForm(false)
      setEditando(null)
      cargar()
      setTimeout(() => setExito(''), 3000)
    } catch {
      setError('Error al guardar el producto')
    }
  }

  const handleEditar = (p: Producto) => {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      stock: String(p.stock),
    })
    setShowForm(true)
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return
    await api.delete(`/productos/${id}`)
    setExito('Producto eliminado')
    cargar()
    setTimeout(() => setExito(''), 3000)
  }

  const handleCancelar = () => {
    setShowForm(false)
    setEditando(null)
    setForm({ nombre: '', descripcion: '', precio: '', stock: '' })
    setError('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">🍰 Gestión de Productos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Nuevo Producto
        </button>
      </div>

      {/* Mensajes */}
      {exito && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">✅ {exito}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">⚠️ {error}</div>}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">
            {editando ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Queque de chocolate"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio (Bs.) *</label>
              <input
                type="number"
                value={form.precio}
                onChange={e => setForm({ ...form, precio: e.target.value })}
                placeholder="Ej: 25.50"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                placeholder="Ej: 10"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción opcional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={handleCancelar} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                {editando ? '💾 Guardar Cambios' : '➕ Crear Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">⏳ Cargando productos...</p>
      ) : productos.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-400 text-lg">No hay productos registrados</p>
          <p className="text-gray-300 text-sm mt-1">Crea tu primer producto con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Producto</th>
                <th className="px-4 py-3 text-left text-sm">Descripción</th>
                <th className="px-4 py-3 text-left text-sm">Precio</th>
                <th className="px-4 py-3 text-left text-sm">Stock</th>
                <th className="px-4 py-3 text-center text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.descripcion || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">Bs. {Number(p.precio).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {p.stock} unidades
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEditar(p)} className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm mr-2">
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleEliminar(p.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
                      🗑️ Eliminar
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
