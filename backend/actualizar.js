import bcrypt from 'bcryptjs';
import sequelize from './config/database.js';

const email = 'admin@farmacia.com';  // Cámbialo si es necesario
const password = process.env.TEMP_ADMIN_PASSWORD;

if (!password || password.length < 12) {
  console.error('Configura TEMP_ADMIN_PASSWORD con al menos 12 caracteres antes de ejecutar este script.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await sequelize.query(
  `UPDATE empleados SET password_hash = ? WHERE correo = ?`,
  { replacements: [hash, email] }
);
console.log('✅ Listo. Ya puedes iniciar sesión.');
process.exit();
