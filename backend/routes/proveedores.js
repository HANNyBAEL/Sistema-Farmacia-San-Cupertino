import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM proveedores ORDER BY id_proveedor DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    const [result] = await sequelize.query(
      'INSERT INTO proveedores (nombre, apellido, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)',
      { replacements: [nombre, apellido, telefono, correo, direccion || null] }
    );
    res.status(201).json({ id_proveedor: result.insertId, message: 'Proveedor creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    await sequelize.query(
      'UPDATE proveedores SET nombre=?, apellido=?, telefono=?, correo=?, direccion=? WHERE id_proveedor=?',
      { replacements: [nombre, apellido, telefono, correo, direccion || null, req.params.id] }
    );
    res.json({ message: 'Proveedor actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM proveedores WHERE id_proveedor = ?',
      { replacements: [req.params.id] }
    );
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;