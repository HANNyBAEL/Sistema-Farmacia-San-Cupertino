import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET todos los clientes
router.get('/', async (req, res) => {
  try {
  const clientes = await sequelize.query(
    `SELECT c.*,
      EXISTS(SELECT 1 FROM ventas v WHERE v.id_cliente = c.id_cliente) AS has_ventas
    FROM clientes c
    WHERE c.papelera = 0
    ORDER BY c.nombre ASC, c.apellido ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );
    res.json(clientes);
  } catch (error) {
    console.error('❌ GET /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un cliente
router.get('/:id', async (req, res) => {
  try {
    const clientes = await sequelize.query(
      'SELECT * FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!clientes.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(clientes[0]);
  } catch (error) {
    console.error('❌ GET /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST crear cliente
router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    const [result] = await sequelize.query(
      `INSERT INTO clientes (nombre, apellido, telefono, correo, direccion, deleted)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion, 0)`,
      {
        replacements: { nombre, apellido, telefono, correo, direccion: direccion || null }
      }
    );
    res.status(201).json({ id_cliente: result, message: 'Cliente creado' });
  } catch (error) {
    console.error('❌ POST /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar cliente
router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    await sequelize.query(
      `UPDATE clientes
       SET nombre = :nombre, apellido = :apellido, telefono = :telefono,
           correo = :correo, direccion = :direccion
       WHERE id_cliente = :id`,
      {
        replacements: {
          nombre, apellido, telefono, correo, direccion: direccion || null,
          id: req.params.id
        }
      }
    );
    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.error('❌ PUT /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH activar/desactivar cliente
// PATCH mover a papelera
router.patch('/:id/papelera', async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE clientes SET papelera = 1 WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ message: 'Cliente movido a papelera' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE clientes SET deleted = NOT deleted WHERE id_cliente = :id',
      { replacements: { id: Number(req.params.id) } }
    );
    res.json({ message: 'Estado del cliente actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE cliente: solo si NO tiene ventas
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const ventas = await sequelize.query(
      'SELECT COUNT(*) as count FROM ventas WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    const tieneVentas = ventas[0].count > 0;
    if (tieneVentas) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene ventas registradas.' });
    }
    await sequelize.query(
      'DELETE FROM clientes WHERE id_cliente = :id',
      { replacements: { id: req.params.id }, type: sequelize.QueryTypes.DELETE, transaction }
    );
    await transaction.commit();
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ DELETE /clientes/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;