import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await sequelize.query(
      'SELECT * FROM clientes ORDER BY id_cliente DESC',
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(clientes);
  } catch (error) {
    console.error('❌ GET /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente
router.post('/', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    const [result] = await sequelize.query(
      `INSERT INTO clientes (nombre, apellido, telefono, correo, direccion)
       VALUES (:nombre, :apellido, :telefono, :correo, :direccion)`,
      {
        replacements: {
          nombre,
          apellido,
          telefono,
          correo,
          direccion: direccion || null
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    console.log('✅ Cliente creado:', result);
    res.status(201).json({ id_cliente: result, message: 'Cliente creado' });
  } catch (error) {
    console.error('❌ POST /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cliente
router.put('/:id', async (req, res) => {
  const { nombre, apellido, telefono, correo, direccion } = req.body;
  try {
    await sequelize.query(
      `UPDATE clientes
       SET nombre = :nombre,
           apellido = :apellido,
           telefono = :telefono,
           correo = :correo,
           direccion = :direccion
       WHERE id_cliente = :id`,
      {
        replacements: {
          nombre,
          apellido,
          telefono,
          correo,
          direccion: direccion || null,
          id: Number(req.params.id)
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    console.log('✅ Cliente actualizado:', req.params.id);
    res.json({ message: 'Cliente actualizado' });
  } catch (error) {
    console.error('❌ PUT /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cliente
router.delete('/:id', async (req, res) => {
  try {
    await sequelize.query(
      'DELETE FROM clientes WHERE id_cliente = :id',
      {
        replacements: { id: Number(req.params.id) },
        type: sequelize.QueryTypes.DELETE
      }
    );
    console.log('✅ Cliente eliminado:', req.params.id);
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    console.error('❌ DELETE /clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;