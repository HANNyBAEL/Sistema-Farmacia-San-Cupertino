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

// ✅ Configuración CORS mejorada para producción
const allowedOrigins = [
  'https://farmacia-san-cupertino.onrender.com', // Tu frontend en Render
  'http://localhost:3000',                       // Desarrollo local (React)
  'http://localhost:5173'                        // Desarrollo local (Vite)
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Origen bloqueado por CORS: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // ✅ PATCH agregado
  allowedHeaders: ['Content-Type', 'Authorization']
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
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL (Sequelize) exitosa');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();