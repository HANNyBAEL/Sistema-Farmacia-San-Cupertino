import { useEffect, useState } from 'react';
import { getVentas, createVenta } from '../services/ventas';
import { getProductos } from '../services/productos'; // para elegir producto

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({ producto_id: '', cantidad: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [ventasData, productosData] = await Promise.all([getVentas(), getProductos()]);
      setVentas(ventasData);
      setProductos(productosData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createVenta({ 
      producto_id: parseInt(form.producto_id), 
      cantidad: parseInt(form.cantidad) 
    });
    setForm({ producto_id: '', cantidad: '' });
    cargarDatos();
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Registro de Ventas</h2>

      <form onSubmit={handleSubmit}>
        <select
          value={form.producto_id}
          onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
          required
        >
          <option value="">Seleccione producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Cantidad"
          value={form.cantidad}
          onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
          required
        />
        <button type="submit">Registrar Venta</button>
      </form>

      <h3>Historial de ventas</h3>
      <table>
        <thead>
          <tr><th>ID</th><th>Fecha</th><th>Total</th></tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.fecha}</td>
              <td>${v.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Ventas;