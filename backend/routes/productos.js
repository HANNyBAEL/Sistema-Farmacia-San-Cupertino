import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM productos LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM productos WHERE id_producto = ?',
      { replacements: [req.params.id] }
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;