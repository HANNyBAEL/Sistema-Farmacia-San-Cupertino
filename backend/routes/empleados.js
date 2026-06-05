import express from 'express';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los empleados
router.get('/', async (req, res) => {
  try {
    const empleados = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo
       FROM empleados
       ORDER BY id_empleado DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(empleados);
  } catch (error) {
    console.error('❌ GET /empleados:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un empleado
router.get('/:id', async (req, res) => {
  try {
    const empleados = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo
       FROM empleados WHERE id_empleado = :id`,
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.SELECT
      }
    );
    if (!empleados.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleados[0]);
  } catch (error) {
    console.error('❌ GET /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST crear empleado
router.post('/', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, password, fecha_contratacion } = req.body;
  if (!nombre || !apellido || !correo || !cargo || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await sequelize.query(
      `INSERT INTO empleados (nombre, apellido, correo, telefono, cargo, password_hash, fecha_contratacion, activo)
       VALUES (:nombre, :apellido, :correo, :telefono, :cargo, :password_hash, :fecha_contratacion, 1)`,
      {
        replacements: {
          nombre,
          apellido,
          correo,
          telefono: telefono || null,
          cargo,
          password_hash,
          fecha_contratacion: fecha_contratacion || null
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    console.log('✅ Empleado creado:', result);
    res.status(201).json({ id_empleado: result, message: 'Empleado creado' });
  } catch (error) {
    console.error('❌ POST /empleados:', error);
    if (error.original?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar empleado
router.put('/:id', async (req, res) => {
  const { nombre, apellido, correo, telefono, cargo, password, fecha_contratacion, activo } = req.body;
  try {
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await sequelize.query(
        `UPDATE empleados
         SET nombre = :nombre,
             apellido = :apellido,
             correo = :correo,
             telefono = :telefono,
             cargo = :cargo,
             password_hash = :password_hash,
             fecha_contratacion = :fecha_contratacion,
             activo = :activo
         WHERE id_empleado = :id`,
        {
          replacements: {
            nombre,
            apellido,
            correo,
            telefono: telefono || null,
            cargo,
            password_hash,
            fecha_contratacion: fecha_contratacion || null,
            activo: activo ?? 1,
            id: Number(req.params.id)
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
    } else {
      await sequelize.query(
        `UPDATE empleados
         SET nombre = :nombre,
             apellido = :apellido,
             correo = :correo,
             telefono = :telefono,
             cargo = :cargo,
             fecha_contratacion = :fecha_contratacion,
             activo = :activo
         WHERE id_empleado = :id`,
        {
          replacements: {
            nombre,
            apellido,
            correo,
            telefono: telefono || null,
            cargo,
            fecha_contratacion: fecha_contratacion || null,
            activo: activo ?? 1,
            id: Number(req.params.id)
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
    }
    console.log('✅ Empleado actualizado:', req.params.id);
    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('❌ PUT /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE desactivar empleado (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE empleados SET activo = 0 WHERE id_empleado = :id`,
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    console.log('✅ Empleado desactivado:', req.params.id);
    res.json({ message: 'Empleado desactivado' });
  } catch (error) {
    console.error('❌ DELETE /empleados/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;