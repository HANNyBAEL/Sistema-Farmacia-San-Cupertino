import express from 'express';
import sequelize from '../config/database.js';
import { registrarAuditoria } from './auditoria.js';

const router = express.Router();

// GET todos los productos (activos e inactivos, excluye papelera)
router.get('/', async (req, res) => {
  try {
    const productos = await sequelize.query(
      `SELECT p.*,
        EXISTS(SELECT 1 FROM detalle_ventas dv WHERE dv.id_producto = p.id_producto) AS has_ventas,
        CONCAT(pr.nombre, ' ', pr.apellido) AS proveedor_nombre,
        GROUP_CONCAT(DISTINCT c.nombre_categoria ORDER BY c.nombre_categoria SEPARATOR ', ') AS categorias_nombres,
        GROUP_CONCAT(DISTINCT pc.id_categoria ORDER BY pc.id_categoria) AS categorias_ids
       FROM productos p
       LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
       LEFT JOIN productos_categorias pc ON pc.id_producto = p.id_producto
       LEFT JOIN categorias c ON c.id_categoria = pc.id_categoria
       WHERE p.papelera = 0
       GROUP BY p.id_producto
       ORDER BY p.nombre_producto ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(productos);
  } catch (error) {
    console.error('❌ GET /productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un producto
router.get('/:id', async (req, res) => {
  try {
    const productos = await sequelize.query(
      `SELECT p.*,
        CONCAT(pr.nombre, ' ', pr.apellido) AS proveedor_nombre,
        GROUP_CONCAT(DISTINCT pc.id_categoria ORDER BY pc.id_categoria) AS categorias_ids
       FROM productos p
       LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
       LEFT JOIN productos_categorias pc ON pc.id_producto = p.id_producto
       WHERE p.id_producto = :id
       GROUP BY p.id_producto`,
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    if (!productos.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(productos[0]);
  } catch (error) {
    console.error('❌ GET /productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST crear producto
router.post('/', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias, codigo_barras, id_empleado, nombre_empleado } = req.body;

  // ✅ Iniciar transacción
  const transaction = await sequelize.transaction();

  try {
    const [result] = await sequelize.query(
      `INSERT INTO productos (nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, deleted, codigo_barras)
       VALUES (:nombre_producto, :descripcion, :precio, :stock, :lote, :fecha_vencimiento, :id_proveedor, 0, :codigo_barras)`,
      {
        replacements: {
          nombre_producto,
          descripcion: descripcion || null,
          precio: Number(precio),
          stock: Number(stock),
          lote,
          fecha_vencimiento,
          id_proveedor: Number(id_proveedor),
          codigo_barras: codigo_barras || null
        },
        type: sequelize.QueryTypes.INSERT,
        transaction // ✅ shorthand para transaction: transaction
      }
    );

    const id_producto = result.insertId ?? result;

    if (categorias && categorias.length) {
      for (const catId of categorias) {
        await sequelize.query(
          'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (:id_producto, :id_categoria)',
          {
            replacements: { id_producto, id_categoria: catId },
            type: sequelize.QueryTypes.INSERT,
            transaction // ✅ misma transacción
          }
        );
      }
    }

    await transaction.commit();

    // Auditoría después del commit (no requiere transacción)
    await registrarAuditoria({
      tabla: 'productos',
      accion: 'CREAR',
      descripcion: `Producto creado: ${nombre_producto}`,
      id_registro: Number(id_producto),
      id_empleado,
      nombre_empleado
    });

    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('producto:creado', { id_producto, nombre_producto });
    }

    res.status(201).json({ id_producto, message: 'Producto creado' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ POST /productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT actualizar producto
router.put('/:id', async (req, res) => {
  const { nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, categorias, codigo_barras, id_empleado, nombre_empleado } = req.body;
  const transaction = await sequelize.transaction();
  try {
    // Leer valores anteriores ANTES del UPDATE
    const [anterior] = await sequelize.query(
      'SELECT nombre_producto, descripcion, precio, stock, lote, fecha_vencimiento, id_proveedor, codigo_barras FROM productos WHERE id_producto = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT, transaction }
    );

    await sequelize.query(
      `UPDATE productos
       SET nombre_producto = :nombre_producto, descripcion = :descripcion,
           precio = :precio, stock = :stock, lote = :lote,
           fecha_vencimiento = :fecha_vencimiento, id_proveedor = :id_proveedor,
           codigo_barras = :codigo_barras
       WHERE id_producto = :id`,
      {
        replacements: {
          nombre_producto, descripcion: descripcion || null,
          precio: Number(precio), stock: Number(stock),
          lote, fecha_vencimiento, id_proveedor: Number(id_proveedor),
          codigo_barras: codigo_barras || null, id: Number(req.params.id)
        },
        type: sequelize.QueryTypes.UPDATE, transaction
      }
    );

    if (categorias !== undefined) {
      await sequelize.query(
        'DELETE FROM productos_categorias WHERE id_producto = :id',
        { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.DELETE, transaction }
      );
      if (categorias.length > 0) {
        for (const catId of categorias) {
          await sequelize.query(
            'INSERT INTO productos_categorias (id_producto, id_categoria) VALUES (:id_producto, :id_categoria)',
            { replacements: { id_producto: Number(req.params.id), id_categoria: catId }, type: sequelize.QueryTypes.INSERT, transaction }
          );
        }
      }
    }

    await transaction.commit();

    // Detectar qué campos cambiaron y registrar uno por uno
    const campos = [
      { campo: 'nombre_producto',   nuevo: nombre_producto,          ant: anterior?.nombre_producto },
      { campo: 'descripcion',       nuevo: descripcion || null,       ant: anterior?.descripcion },
      { campo: 'precio',            nuevo: Number(precio),            ant: Number(anterior?.precio) },
      { campo: 'stock',             nuevo: Number(stock),             ant: Number(anterior?.stock) },
      { campo: 'lote',              nuevo: lote,                      ant: anterior?.lote },
      { campo: 'fecha_vencimiento', nuevo: fecha_vencimiento,         ant: anterior?.fecha_vencimiento },
      { campo: 'id_proveedor',      nuevo: Number(id_proveedor),      ant: Number(anterior?.id_proveedor) },
      { campo: 'codigo_barras',     nuevo: codigo_barras || null,     ant: anterior?.codigo_barras },
    ];

    for (const c of campos) {
      if (String(c.ant) !== String(c.nuevo)) {
        await registrarAuditoria({
          tabla: 'productos', accion: 'EDITAR',
          descripcion: `Producto editado: ${nombre_producto}`,
          id_registro: Number(req.params.id), id_empleado, nombre_empleado,
          campo_modificado: c.campo,
          valor_anterior: String(c.ant ?? ''),
          valor_nuevo: String(c.nuevo ?? '')
        });
      }
    }

    // Si no cambió nada, registrar igual sin detalle
    if (!campos.some(c => String(c.ant) !== String(c.nuevo))) {
      await registrarAuditoria({
        tabla: 'productos', accion: 'EDITAR',
        descripcion: `Producto editado: ${nombre_producto}`,
        id_registro: Number(req.params.id), id_empleado, nombre_empleado
      });
    }

    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('producto:actualizado', { id: Number(req.params.id), nombre_producto });
    }

    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ PUT /productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH activar/desactivar producto
router.patch('/:id/toggle', async (req, res) => {
  const { id_empleado, nombre_empleado } = req.body;
  try {
    const [prod] = await sequelize.query(
      'SELECT nombre_producto, deleted FROM productos WHERE id_producto = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.SELECT }
    );
    await sequelize.query(
      'UPDATE productos SET deleted = NOT deleted WHERE id_producto = :id',
      { replacements: { id: Number(req.params.id) }, type: sequelize.QueryTypes.UPDATE }
    );
    const accion = prod.deleted ? 'ACTIVAR' : 'DESACTIVAR';
    await registrarAuditoria({
      tabla: 'productos', accion,
      descripcion: `Producto ${prod.deleted ? 'activado' : 'desactivado'}: ${prod.nombre_producto}`,
      id_registro: Number(req.params.id), id_empleado, nombre_empleado
    });

    // Emitir evento Socket.io para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('producto:estado_cambiado', { id: Number(req.params.id), nombre_producto: prod.nombre_producto, deleted: !prod.deleted });
    }

    res.json({ message: 'Estado del producto actualizado' });
  } catch (error) {
    console.error('❌ PATCH /productos/:id/toggle:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH mover a papelera
router.patch('/:id/papelera', async (req, res) => {
  res.status(405).json({ error: 'Los productos no se eliminan. Usa la opcion Desactivar.' });
});

// DELETE deshabilitado: los productos solo se desactivan.
router.delete('/:id', async (req, res) => {
  res.status(405).json({ error: 'Los productos no se eliminan. Usa la opcion Desactivar.' });
});

export default router;
