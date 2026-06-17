import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // ✅ Incluir activo y token_version en la consulta
    const [user] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, password_hash, cargo, activo, token_version
       FROM empleados 
       WHERE correo = ?`,
      { replacements: [email], type: sequelize.QueryTypes.SELECT }
    );

    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    // ✅ Verificar que el empleado esté activo
    if (user.activo === 0) {
      return res.status(401).json({ error: 'Usuario desactivado. Contacte al administrador.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    // ✅ Incluir token_version en el payload del JWT
    const token = jwt.sign(
      { 
        id: user.id_empleado, 
        rol: user.cargo,
        token_version: user.token_version 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      rol: user.cargo,
      nombre: `${user.nombre} ${user.apellido}`,
      id: user.id_empleado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;