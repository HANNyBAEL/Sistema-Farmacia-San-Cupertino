import bcrypt from 'bcryptjs';
import sequelize from './config/database.js';

const email = 'admin@farmacia.com';  // Cámbialo si es necesario
const password = 'admin123';

const hash = await bcrypt.hash(password, 10);
await sequelize.query(
  `UPDATE empleados SET password_hash = ? WHERE correo = ?`,
  { replacements: [hash, email] }
);
console.log('✅ Listo. Ya puedes iniciar sesión.');
process.exit();
