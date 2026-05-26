import { useEffect, useState } from 'react';
import { fetchKPIs, fetchVentasUltimos7Dias } from '../services/dashboard';
import Card from '../components/Card';
import GraficaVentasSemana from '../components/GraficaVentasSemana';

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [datosKpis, datosVentas] = await Promise.all([
          fetchKPIs(),
          fetchVentasUltimos7Dias()
        ]);
        setKpis(datosKpis);
        setVentasSemana(datosVentas);
      } catch (error) {
        console.error('Error al cargar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  if (loading) return <p>Cargando indicadores...</p>;
  if (!kpis) return <p>Error al cargar los datos.</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Dashboard - Farmacia San Cupertino</h2>
      
      {/* Tarjetas de KPIs */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Card titulo="Total Productos" valor={kpis.totalProductos} />
        <Card titulo="Stock Bajo (≤20)" valor={kpis.stockBajo} />
        <Card titulo="Agotados" valor={kpis.agotados} />
        <Card titulo="Stock Crítico (≤10)" valor={kpis.stockCritico} />
        <Card titulo="Ventas Hoy" valor={kpis.ventasHoy} />
        <Card titulo="Ingresos Hoy" valor={`$${kpis.ingresosHoy.toFixed(2)}`} />
        <Card titulo="Por Vencer (30 días)" valor={kpis.porVencer} />
        <Card titulo="Proveedores Activos" valor={kpis.proveedoresActivos} />
        <Card titulo="Empleados Activos" valor={kpis.empleadosActivos} />
      </div>

      {/* Gráfica de ventas */}
      <h3>Ventas últimos 7 días</h3>
      <GraficaVentasSemana datos={ventasSemana} />
    </div>
  );
};

export default Dashboard;