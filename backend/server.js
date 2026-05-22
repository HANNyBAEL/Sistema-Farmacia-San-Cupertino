import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import productoRoutes from './routes/productos.js';
import ventaRoutes from './routes/ventas.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);

// Probar conexión a BD
try {
  await sequelize.authenticate();
  console.log('✅ Conexión a MySQL exitosa');
} catch (error) {
  console.error('❌ Error de conexión:', error);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
