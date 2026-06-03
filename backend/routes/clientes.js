import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM clientes ORDER BY id_cliente DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente
router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    const [result] = await sequelize.query(
      'INSERT INTO clientes (nombre, apellido, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)',
      { replacements: [nombre, apellido, telefono, correo, direccion || null] }
    );
    res.status(201).json({ id_cliente: result.insertId, message: 'Cliente creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    await sequelize.query(
      'UPDATE clientes SET nombre=?, apellido=?, telefono=?, correo=?, direccion=? WHERE id_cliente=?',
      { replacements: [nombre, apellido, telefono, correo, direccion || null, req.params.id] }
    );
    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cliente
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM clientes WHERE id_cliente = ?',
      { replacements: [req.params.id] }
    );
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;