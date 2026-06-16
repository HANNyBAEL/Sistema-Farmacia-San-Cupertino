import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import productoRoutes from './routes/productos.js';
import ventaRoutes from './routes/ventas.js';
import dashboardRoutes from './routes/dashboard.js';
import clienteRoutes from './routes/clientes.js';
import proveedorRoutes from './routes/proveedores.js';
import empleadoRoutes from './routes/empleados.js';     // ← NUEVO
import historialRoutes from './routes/historial.js';     // ← NUEVO
import eliminadosRoutes from './routes/eliminados.js';   // ← NUEVO
import facturasRouter from './routes/facturas.js';
import auditoriaRoutes from './routes/auditoria.js';


dotenv.config();
const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/productos',   productoRoutes);
app.use('/api/ventas',      ventaRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/clientes',    clienteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/empleados',   empleadoRoutes);   // ← NUEVO
app.use('/api/historial',   historialRoutes);  // ← NUEVO
app.use('/api/eliminados',  eliminadosRoutes); // ← NUEVO
app.use('/api/facturas', facturasRouter);
app.use('/api/auditoria', auditoriaRoutes);


try {
  await sequelize.authenticate();
  console.log('✅ Conexión a MySQL exitosa');
} catch (error) {
  console.error('❌ Error de conexión:', error);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});