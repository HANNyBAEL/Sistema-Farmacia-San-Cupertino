import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// Importa el pool de conexiones (desde db.js)
import pool from './db.js';

// Importa Sequelize si lo usas para modelos
import sequelize from './config/database.js';

// Importa rutas
import authRoutes from './routes/auth.js';
import productoRoutes from './routes/productos.js';
import ventaRoutes from './routes/ventas.js';
import dashboardRoutes from './routes/dashboard.js';
import clienteRoutes from './routes/clientes.js';
import proveedorRoutes from './routes/proveedores.js';
import empleadoRoutes from './routes/empleados.js';
import historialRoutes from './routes/historial.js';
import eliminadosRoutes from './routes/eliminados.js';
import facturasRouter from './routes/facturas.js';
import auditoriaRoutes from './routes/auditoria.js';

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Registro de rutas
app.use('/api/auth',        authRoutes);
app.use('/api/productos',   productoRoutes);
app.use('/api/ventas',      ventaRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/clientes',    clienteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/empleados',   empleadoRoutes);
app.use('/api/historial',   historialRoutes);
app.use('/api/eliminados',  eliminadosRoutes);
app.use('/api/facturas',    facturasRouter);
app.use('/api/auditoria',   auditoriaRoutes);

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Verificar conexión a la base de datos (Sequelize)
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL (Sequelize) exitosa');

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();