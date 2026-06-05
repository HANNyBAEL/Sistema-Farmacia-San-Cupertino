import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// Obtener todos los proveedores
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM proveedores ORDER BY id_proveedor DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un proveedor
router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  // Validación básica
  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  }
  try {
    const [result] = await sequelize.query(
      `INSERT INTO proveedores (nombre, apellido, telefono, correo, direccion)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion)`,
      {
        replacements: {
          nombre,
          apellido,
          telefono: telefono || null,
          correo: correo || null,
          direccion: direccion || null
        }
      }
    );
    res.status(201).json({ id_proveedor: result.insertId, message: 'Proveedor creado' });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un proveedor
router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  const id = req.params.id;
  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  }
  try {
    await sequelize.query(
      `UPDATE proveedores
       SET nombre = :nombre, apellido = :apellido, telefono = :telefono,
           correo = :correo, direccion = :direccion
       WHERE id_proveedor = :id`,
      {
        replacements: {
          nombre,
          apellido,
          telefono: telefono || null,
          correo: correo || null,
          direccion: direccion || null,
          id
        }
      }
    );
    res.json({ message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un proveedor
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await sequelize.query(
      'DELETE FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id } }
    );
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;