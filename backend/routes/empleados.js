import express from 'express';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los empleados
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo
       FROM empleados
       ORDER BY id_empleado DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET un empleado
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT id_empleado, nombre, apellido, correo, telefono, cargo, fecha_contratacion, activo
       FROM empleados WHERE id_empleado = ?`,
      { replacements: [req.params.id] }
    );
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (error) {
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
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      { replacements: [nombre, apellido, correo, telefono || null, cargo, password_hash, fecha_contratacion || null] }
    );
    res.status(201).json({ id_empleado: result.insertId, message: 'Empleado creado' });
  } catch (error) {
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
        `UPDATE empleados SET nombre=?, apellido=?, correo=?, telefono=?, cargo=?, password_hash=?, fecha_contratacion=?, activo=?
         WHERE id_empleado=?`,
        { replacements: [nombre, apellido, correo, telefono || null, cargo, password_hash, fecha_contratacion || null, activo ?? 1, req.params.id] }
      );
    } else {
      await sequelize.query(
        `UPDATE empleados SET nombre=?, apellido=?, correo=?, telefono=?, cargo=?, fecha_contratacion=?, activo=?
         WHERE id_empleado=?`,
        { replacements: [nombre, apellido, correo, telefono || null, cargo, fecha_contratacion || null, activo ?? 1, req.params.id] }
      );
    }
    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE desactivar empleado (soft delete — no se elimina por seguridad de auditoría)
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE empleados SET activo = 0 WHERE id_empleado = ?`,
      { replacements: [req.params.id] }
    );
    res.json({ message: 'Empleado desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;