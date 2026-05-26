import { useEffect, useState } from 'react';
import { getProductos, createProducto, deleteProducto } from '../services/productos';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', precio: '', stock: '' });

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createProducto({ ...form, precio: parseFloat(form.precio), stock: parseInt(form.stock) });
    setForm({ nombre: '', precio: '', stock: '' });
    cargarProductos(); // recargar lista
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar producto?')) {
      await deleteProducto(id);
      cargarProductos();
    }
  };

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div>
      <h2>Gestión de Productos</h2>

      {/* Formulario para agregar */}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Precio"
          value={form.precio}
          onChange={(e) => setForm({ ...form, precio: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          required
        />
        <button type="submit">Agregar Producto</button>
      </form>

      {/* Tabla de productos */}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.nombre}</td>
              <td>${prod.precio}</td>
              <td>{prod.stock}</td>
              <td>
                <button onClick={() => handleDelete(prod.id)}>Eliminar</button>
                {/* Podrías agregar un botón para editar */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Productos;