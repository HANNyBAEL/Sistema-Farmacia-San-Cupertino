import bcrypt from 'bcryptjs';
import sequelize from './config/database.js';

const hash = await bcrypt.hash('admin123', 10);
await sequelize.query(
  `UPDATE empleados SET password_hash = ? WHERE correo = 'admin@farmacia.com'`,
  { replacements: [hash] }
);
console.log('✅ Contraseña actualizada para admin@farmacia.com');
process.exit();
