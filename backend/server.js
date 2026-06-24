import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// Importa el pool de conexiones (desde db.js)
import pool from './db.js';

// Importa Sequelize si lo usas para modelos
import sequelize from './config/database.js';
import { createRateLimiter, helmetSecurityHeaders, noStoreApiCache, securityHeaders } from './middlewares/security.js';

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
import auditoriaRoutes from './routes/auditoria.js';
import facturasRoutes from './routes/facturasRoutes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmetSecurityHeaders);
app.use(securityHeaders);

// ✅ CORS primero
const allowedOrigins = [
  'https://farmacia-san-cupertino.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Origen bloqueado por CORS: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Parsers ANTES de las rutas
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ Rutas DESPUÉS de los parsers
app.use('/api', noStoreApiCache);

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
});

const passwordRecoveryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiadas solicitudes. Espera unos minutos antes de volver a intentar.',
});

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/establecer-contrasena', passwordRecoveryRateLimiter);
app.use('/api/auth/solicitar-recuperacion', passwordRecoveryRateLimiter);
app.use('/api/auth/recuperar-contrasena', passwordRecoveryRateLimiter);

app.use('/api/auth',        authRoutes);
app.use('/api/productos',   productoRoutes);
app.use('/api/ventas',      ventaRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/clientes',    clienteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/empleados',   empleadoRoutes);
app.use('/api/historial',   historialRoutes);
app.use('/api/eliminados',  eliminadosRoutes);
app.use('/api/auditoria',   auditoriaRoutes);
app.use('/api/facturas',    facturasRoutes);

const PORT = process.env.PORT || 8000;

async function ensureSchema() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM empleados LIKE 'papelera'");
  if (columns.length === 0) {
    await sequelize.query("ALTER TABLE empleados ADD COLUMN papelera TINYINT(1) NOT NULL DEFAULT 0 AFTER activo");
  }

  const [fechaVentaColumns] = await sequelize.query("SHOW COLUMNS FROM ventas LIKE 'fecha'");
  const fechaVentaType = fechaVentaColumns[0]?.Type?.toLowerCase() ?? '';
  if (fechaVentaType === 'date') {
    await sequelize.query("ALTER TABLE ventas MODIFY COLUMN fecha DATETIME NOT NULL");
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    await ensureSchema();
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
