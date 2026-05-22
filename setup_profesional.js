const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Crear carpetas principales
const carpetas = [
  'backend/config',
  'backend/controllers',
  'backend/routes',
  'backend/middlewares',
  'backend/models',
  'backend/seeders',
  'frontend/src/components',
  'frontend/src/pages',
  'frontend/src/services',
  'frontend/src/hooks',
  'frontend/src/context',
  'frontend/src/assets'
];

carpetas.forEach(carpeta => {
  fs.mkdirSync(carpeta, { recursive: true });
  console.log(`✅ Creada: ${carpeta}`);
});

// ========== ARCHIVOS DEL BACKEND ==========

// package.json del backend
fs.writeFileSync('backend/package.json', JSON.stringify({
  name: "farmacia-backend",
  version: "1.0.0",
  type: "module",
  scripts: {
    start: "node server.js",
    dev: "nodemon server.js"
  },
  dependencies: {
    express: "^4.18.2",
    sequelize: "^6.32.1",
    mysql2: "^3.6.0",
    dotenv: "^16.3.1",
    cors: "^2.8.5",
    jsonwebtoken: "^9.0.1",
    bcryptjs: "^2.4.3"
  },
  devDependencies: {
    nodemon: "^3.0.1"
  }
}, null, 2));

// .env
fs.writeFileSync('backend/.env', `PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=farmaciassancupertino
JWT_SECRET=supersecretkey2026
`);

// config/database.js
fs.writeFileSync('backend/config/database.js', `import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

export default sequelize;
`);

// models/Producto.js
fs.writeFileSync('backend/models/Producto.js', `import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Producto = sequelize.define('Producto', {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_producto: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lote: {
    type: DataTypes.STRING(30),
    unique: true
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY
  },
  id_proveedor: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'productos',
  timestamps: false
});

export default Producto;
`);

// server.js
fs.writeFileSync('backend/server.js', `import express from 'express';
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
  console.log(\`🚀 Servidor corriendo en http://localhost:\${PORT}\`);
});
`);

// ========== ARCHIVOS DEL FRONTEND (React + Vite) ==========

fs.writeFileSync('frontend/package.json', JSON.stringify({
  name: "farmacia-frontend",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview"
  },
  dependencies: {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    axios: "^1.4.0",
    "react-router-dom": "^6.14.2"
  },
  devDependencies: {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    vite: "^4.4.5",
    tailwindcss: "^3.3.3",
    autoprefixer: "^10.4.14",
    postcss: "^8.4.27"
  }
}, null, 2));

// vite.config.js
fs.writeFileSync('frontend/vite.config.js', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
`);

// index.html
fs.writeFileSync('frontend/index.html', `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Farmacia San Cupertino</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`);

// src/main.jsx
fs.writeFileSync('frontend/src/main.jsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

// src/App.jsx
fs.writeFileSync('frontend/src/App.jsx', `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/productos" element={<Productos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`);

// src/index.css (Tailwind)
fs.writeFileSync('frontend/src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

// tailwind.config.js
fs.writeFileSync('frontend/tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
`);

// postcss.config.js
fs.writeFileSync('frontend/postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

// Componente de Login simple
fs.writeFileSync('frontend/src/pages/Login.jsx', `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('rol', res.data.rol);
      navigate('/dashboard');
    } catch (error) {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Farmacia San Cupertino</h1>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded mb-4" required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" required />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Iniciar sesión</button>
      </form>
    </div>
  );
}

export default Login;
`);

// Dashboard básico
fs.writeFileSync('frontend/src/pages/Dashboard.jsx', `function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded shadow">Ventas hoy: 0</div>
        <div className="bg-white p-4 rounded shadow">Productos bajos: 0</div>
        <div className="bg-white p-4 rounded shadow">Ingresos hoy: $0</div>
        <div className="bg-white p-4 rounded shadow">Alertas: 0</div>
      </div>
    </div>
  );
}
export default Dashboard;
`);

console.log('\n🎉 ¡Estructura profesional creada con éxito!');
console.log('\n📌 Próximos pasos:');
console.log('1. cd backend && npm install');
console.log('2. Configurar .env con tu contraseña de MySQL');
console.log('3. cd ../frontend && npm install');
console.log('4. npm run dev (en backend) y npm run dev (en frontend)');