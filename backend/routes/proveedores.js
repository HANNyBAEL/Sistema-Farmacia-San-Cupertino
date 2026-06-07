import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los proveedores
router.get('/', async (req, res) => {
  try {
  const proveedores = await sequelize.query(
    `SELECT p.*,
      EXISTS(SELECT 1 FROM productos pr WHERE pr.id_proveedor = p.id_proveedor) AS has_productos
    FROM proveedores p
    WHERE p.papelera = 0
    ORDER BY p.nombre ASC, p.apellido ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );
    res.json(proveedores);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST crear proveedor
router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  }
  try {
    const [result] = await sequelize.query(
      `INSERT INTO proveedores (nombre, apellido, telefono, correo, direccion, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, 0)`,
      {
        replacements: {
          nombre, apellido,
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

// PUT actualizar proveedor
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
          nombre, apellido,
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


// PATCH mover a papelera
router.patch('/:id/papelera', async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE proveedores SET papelera = 1 WHERE id_proveedor = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ message: 'Proveedor movido a papelera' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE proveedor: solo si NO tiene productos
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const productos = await sequelize.query(
      'SELECT COUNT(*) as count FROM productos WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    const tieneProductos = productos[0].count > 0;
    if (tieneProductos) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede eliminar el proveedor porque tiene productos registrados. Puedes desactivarlo.' });
    }
    await sequelize.query(
      'DELETE FROM proveedores WHERE id_proveedor = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.DELETE, transaction }
    );
    await transaction.commit();
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;