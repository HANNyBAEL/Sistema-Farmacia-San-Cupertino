import express from 'express';
import sequelize from '../config/database.js';

const router = express.Router();

export async function registrarAuditoria({ tabla, accion, descripcion, id_registro, id_empleado, nombre_empleado, campo_modificado = null, valor_anterior = null, valor_nuevo = null }) {
  try {
    await sequelize.query(
      `INSERT INTO auditoria (tabla, accion, descripcion, id_registro, id_empleado, nombre_empleado, campo_modificado, valor_anterior, valor_nuevo)
       VALUES (:tabla, :accion, :descripcion, :id_registro, :id_empleado, :nombre_empleado, :campo_modificado, :valor_anterior, :valor_nuevo)`,
      {
        replacements: {
          tabla, accion, descripcion,
          id_registro: id_registro || null,
          id_empleado: id_empleado || null,
          nombre_empleado: nombre_empleado || null,
          campo_modificado,
          valor_anterior,
          valor_nuevo
        }
      }
    );
  } catch (e) {
    console.error('❌ Error al registrar auditoría:', e.message);
  }
}

router.get('/', async (req, res) => {
  const { tabla, accion, from, to, limit = 50, offset = 0 } = req.query;

  let where = 'WHERE 1=1';
  const replacements = [];

  if (tabla)  { where += ' AND tabla = ?';  replacements.push(tabla); }
  if (accion) { where += ' AND accion = ?'; replacements.push(accion); }
  if (from)   { where += ' AND fecha >= ?'; replacements.push(from); }
  if (to)     { where += ' AND fecha <= ?'; replacements.push(`${to} 23:59:59`); }

  replacements.push(parseInt(limit), parseInt(offset));

  try {
    const [rows] = await sequelize.query(
      `SELECT * FROM auditoria ${where} ORDER BY fecha DESC LIMIT ? OFFSET ?`,
      { replacements }
    );
    const countReplacements = replacements.slice(0, -2);
    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) as total FROM auditoria ${where}`,
      { replacements: countReplacements }
    );
    res.json({ data: rows, total: parseInt(total) });
  } catch (error) {
    console.error('❌ GET /auditoria:', error);
    res.status(500).json({ error: error.message });
  }
});
export default router;