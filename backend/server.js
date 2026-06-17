import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config(); // ✅ Solo UNA vez, al inicio

// Importa el pool de conexiones (para consultas SQL directas)
import pool from './db.js';  // Asegúrate de que db.js exporte el pool con promesas

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



import mysql from 'mysql2';
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {                      // 👈 Agrega esto
        require: true,
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convierte la pool para usar promesas (async/await)
const promisePool = pool.promise();
dotenv.config();

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
    // Verificar conexión a la base de datos (si usas Sequelize)
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