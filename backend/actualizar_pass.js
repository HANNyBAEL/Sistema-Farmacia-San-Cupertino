import bcrypt from 'bcryptjs';
import sequelize from './config/database.js';

const email = 'josepena@gmail.com';   // usa un correo que exista en tu BD
const password = 'admin123';

const hash = await bcrypt.hash(password, 10);
await sequelize.query(
  `UPDATE empleados SET password_hash = ? WHERE correo = ?`,
  { replacements: [hash, email] }
);
console.log(`✅ Contraseña actualizada para ${email}`);
process.exit();