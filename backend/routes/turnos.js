import express from 'express';
import sequelize from '../config/database.js';
import { getFechaHoraLocal } from '../utils/fechaLocal.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

const DENOMINACIONES = [
  0.01, 0.05, 0.10, 0.25, 0.50, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00
];

// ─── VERIFICAR SI EL USUARIO TIENE TURNO ABIERTO ────────────────────────
router.get('/activo', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [turno] = await sequelize.query(
      `SELECT * FROM turnos 
       WHERE id_empleado = :userId AND estado = 'abierto'
       ORDER BY id_turno DESC LIMIT 1`,
      { 
        replacements: { userId }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    if (!turno) {
      return res.json({ tieneTurnoAbierto: false });
    }

    // Obtener denominaciones de apertura
    const denominaciones = await sequelize.query(
      `SELECT denominacion, cantidad, monto FROM turno_denominaciones
       WHERE id_turno = :idTurno AND tipo = 'apertura'
       ORDER BY denominacion`,
      { 
        replacements: { idTurno: turno.id_turno }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    res.json({ 
      tieneTurnoAbierto: true, 
      turno: { ...turno, denominaciones } 
    });
  } catch (error) {
    console.error('❌ Error en GET /turnos/activo:', error);
    res.status(500).json({ error: 'Error al verificar turno activo' });
  }
});

// ─── ABRIR TURNO (APERTURA DE CAJA) ───────────────────────────────────────
router.post('/abrir', authenticate, authorize(['cajero', 'administrador']), async (req, res) => {
  const { denominaciones } = req.body;
  const userId = req.user.id;
  const userName = req.user.nombre || 'Usuario';
  const userEmail = req.user.email || 'usuario';

  const transaction = await sequelize.transaction();

  try {
    // Verificar si ya tiene un turno abierto
    const [turnoExistente] = await sequelize.query(
      `SELECT id_turno FROM turnos 
       WHERE id_empleado = :userId AND estado = 'abierto'`,
      { 
        replacements: { userId }, 
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (turnoExistente) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Ya tienes un turno abierto' });
    }

    // Validar denominaciones
    if (!denominaciones || !Array.isArray(denominaciones)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Denominaciones inválidas' });
    }

    // Calcular total inicial
    let totalInicial = 0;
    for (const den of denominaciones) {
      if (!den.denominacion || den.cantidad === undefined || den.cantidad === null) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cada denominación debe tener denominación y cantidad' });
      }
      const monto = den.denominacion * den.cantidad;
      totalInicial += monto;
    }

    const fechaHora = getFechaHoraLocal();
    const fecha = fechaHora.split(' ')[0];

    // Insertar turno
    const [turnoResult] = await sequelize.query(
      `INSERT INTO turnos 
       (fecha, hora_inicio, id_empleado, nombre_empleado, usuario_pos, caja_inicial, estado)
       VALUES (:fecha, :horaInicio, :userId, :nombreEmpleado, :usuarioPos, :cajaInicial, 'abierto')`,
      {
        replacements: { 
          fecha, 
          horaInicio: fechaHora, 
          userId, 
          nombreEmpleado: userName, 
          usuarioPos: userEmail, 
          cajaInicial: totalInicial 
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      }
    );

    const idTurno = turnoResult.insertId ?? turnoResult;

    // Insertar denominaciones de apertura
    for (const den of denominaciones) {
      const monto = den.denominacion * den.cantidad;
      await sequelize.query(
        `INSERT INTO turno_denominaciones 
         (id_turno, denominacion, cantidad, monto, tipo)
         VALUES (:idTurno, :denominacion, :cantidad, :monto, 'apertura')`,
        {
          replacements: { 
            idTurno, 
            denominacion: den.denominacion, 
            cantidad: den.cantidad, 
            monto 
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    }

    await transaction.commit();

    res.status(201).json({ 
      message: 'Turno abierto exitosamente', 
      id_turno: idTurno, 
      caja_inicial: totalInicial 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en POST /turnos/abrir:', error);
    res.status(500).json({ error: 'Error al abrir turno' });
  }
});

// ─── OBTENER RECAUDACIÓN DEL TURNO ────────────────────────────────────────
router.get('/recaudacion/:idTurno', authenticate, async (req, res) => {
  try {
    const { idTurno } = req.params;

    // Obtener información del turno
    const [turno] = await sequelize.query(
      `SELECT * FROM turnos WHERE id_turno = :idTurno`,
      { 
        replacements: { idTurno }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // Calcular recaudación por método de pago
    const recaudacion = await sequelize.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
        COALESCE(SUM(CASE WHEN metodo_pago = 'apple_pay' THEN total ELSE 0 END), 0) as total_apple_pay,
        COALESCE(SUM(CASE WHEN metodo_pago = 'paypal' THEN total ELSE 0 END), 0) as total_paypal,
        COALESCE(SUM(CASE WHEN metodo_pago = 'western_union' THEN total ELSE 0 END), 0) as total_western_union,
        COALESCE(SUM(total), 0) as recaudacion_total
       FROM ventas 
       WHERE id_empleado = :idEmpleado 
         AND fecha >= :horaInicio 
         AND (hora_cierre IS NULL OR fecha <= :horaCierre)`,
      { 
        replacements: { 
          idEmpleado: turno.id_empleado, 
          horaInicio: turno.hora_inicio,
          horaCierre: turno.hora_cierre || getFechaHoraLocal()
        }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    res.json(recaudacion[0] || {
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      total_apple_pay: 0,
      total_paypal: 0,
      total_western_union: 0,
      recaudacion_total: 0
    });
  } catch (error) {
    console.error('❌ Error en GET /turnos/recaudacion/:idTurno:', error);
    res.status(500).json({ error: 'Error al obtener recaudación' });
  }
});

// ─── CERRAR TURNO (CIERRE DE CAJA) ────────────────────────────────────────
router.post('/cerrar', authenticate, authorize(['cajero', 'administrador']), async (req, res) => {
  const { id_turno, denominaciones, observaciones } = req.body;
  const userId = req.user.id;

  const transaction = await sequelize.transaction();

  try {
    // Verificar que el turno existe y está abierto
    const [turno] = await sequelize.query(
      `SELECT * FROM turnos WHERE id_turno = :idTurno AND estado = 'abierto'`,
      { 
        replacements: { idTurno: id_turno }, 
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!turno) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });
    }

    if (turno.id_empleado !== userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No puedes cerrar un turno de otro empleado' });
    }

    // Validar denominaciones
    if (!denominaciones || !Array.isArray(denominaciones)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Denominaciones inválidas' });
    }

    // Calcular total final
    let totalFinal = 0;
    for (const den of denominaciones) {
      if (!den.denominacion || den.cantidad === undefined || den.cantidad === null) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cada denominación debe tener denominación y cantidad' });
      }
      const monto = den.denominacion * den.cantidad;
      totalFinal += monto;
    }

    // Obtener recaudación del turno
    const recaudacion = await sequelize.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
        COALESCE(SUM(CASE WHEN metodo_pago = 'apple_pay' THEN total ELSE 0 END), 0) as total_apple_pay,
        COALESCE(SUM(CASE WHEN metodo_pago = 'paypal' THEN total ELSE 0 END), 0) as total_paypal,
        COALESCE(SUM(CASE WHEN metodo_pago = 'western_union' THEN total ELSE 0 END), 0) as total_western_union,
        COALESCE(SUM(total), 0) as recaudacion_total
       FROM ventas 
       WHERE id_empleado = :idEmpleado 
         AND fecha >= :horaInicio`,
      { 
        replacements: { 
          idEmpleado: turno.id_empleado, 
          horaInicio: turno.hora_inicio
        }, 
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const rec = recaudacion[0] || {
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      total_apple_pay: 0,
      total_paypal: 0,
      total_western_union: 0,
      recaudacion_total: 0
    };

    // Calcular diferencia de caja
    // Efectivo esperado = Caja inicial + Ventas en efectivo - Retiros (si existen)
    const efectivoEsperado = turno.caja_inicial + rec.total_efectivo;
    const diferenciaCaja = totalFinal - efectivoEsperado;

    const horaCierre = getFechaHoraLocal();

    // Actualizar turno
    await sequelize.query(
      `UPDATE turnos SET
       hora_cierre = :horaCierre,
       caja_final = :cajaFinal,
       total_efectivo = :totalEfectivo,
       total_transferencia = :totalTransferencia,
       total_apple_pay = :totalApplePay,
       total_paypal = :totalPaypal,
       total_western_union = :totalWesternUnion,
       recaudacion_total = :recaudacionTotal,
       diferencia_caja = :diferenciaCaja,
       observaciones = :observaciones,
       estado = 'cerrado'
       WHERE id_turno = :idTurno`,
      {
        replacements: { 
          horaCierre,
          cajaFinal: totalFinal,
          totalEfectivo: rec.total_efectivo,
          totalTransferencia: rec.total_transferencia,
          totalApplePay: rec.total_apple_pay,
          totalPaypal: rec.total_paypal,
          totalWesternUnion: rec.total_western_union,
          recaudacionTotal: rec.recaudacion_total,
          diferenciaCaja,
          observaciones: observaciones || null,
          idTurno: id_turno
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    // Insertar denominaciones de cierre
    for (const den of denominaciones) {
      const monto = den.denominacion * den.cantidad;
      await sequelize.query(
        `INSERT INTO turno_denominaciones 
         (id_turno, denominacion, cantidad, monto, tipo)
         VALUES (:idTurno, :denominacion, :cantidad, :monto, 'cierre')
         ON DUPLICATE KEY UPDATE cantidad = :cantidad, monto = :monto`,
        {
          replacements: { 
            idTurno: id_turno, 
            denominacion: den.denominacion, 
            cantidad: den.cantidad, 
            monto 
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    }

    await transaction.commit();

    res.json({ 
      message: 'Turno cerrado exitosamente',
      turno: {
        id_turno,
        caja_inicial: turno.caja_inicial,
        caja_final: totalFinal,
        recaudacion: rec,
        diferencia_caja: diferenciaCaja
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en POST /turnos/cerrar:', error);
    res.status(500).json({ error: 'Error al cerrar turno' });
  }
});

// ─── OBTENER DETALLES DE UN TURNO PARA IMPRESIÓN ───────────────────────────
router.get('/:idTurno', authenticate, async (req, res) => {
  try {
    const { idTurno } = req.params;

    // Obtener información del turno
    const [turno] = await sequelize.query(
      `SELECT * FROM turnos WHERE id_turno = :idTurno`,
      { 
        replacements: { idTurno }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // Obtener denominaciones de apertura
    const denominacionesApertura = await sequelize.query(
      `SELECT denominacion, cantidad, monto FROM turno_denominaciones
       WHERE id_turno = :idTurno AND tipo = 'apertura'
       ORDER BY denominacion`,
      { 
        replacements: { idTurno }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    // Obtener denominaciones de cierre
    const denominacionesCierre = await sequelize.query(
      `SELECT denominacion, cantidad, monto FROM turno_denominaciones
       WHERE id_turno = :idTurno AND tipo = 'cierre'
       ORDER BY denominacion`,
      { 
        replacements: { idTurno }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    res.json({
      turno,
      denominaciones_apertura: denominacionesApertura,
      denominaciones_cierre: denominacionesCierre
    });
  } catch (error) {
    console.error('❌ Error en GET /turnos/:idTurno:', error);
    res.status(500).json({ error: 'Error al obtener detalles del turno' });
  }
});

// ─── OBTENER HISTORIAL DE TURNOS ───────────────────────────────────────────
router.get('/historial/:idEmpleado', authenticate, async (req, res) => {
  try {
    const { idEmpleado } = req.params;
    const { limite = 20 } = req.query;

    const turnos = await sequelize.query(
      `SELECT id_turno, fecha, hora_inicio, hora_cierre, nombre_empleado,
              caja_inicial, caja_final, recaudacion_total, diferencia_caja, estado
       FROM turnos 
       WHERE id_empleado = :idEmpleado
       ORDER BY id_turno DESC
       LIMIT :limite`,
      { 
        replacements: { idEmpleado, limite: parseInt(limite) }, 
        type: sequelize.QueryTypes.SELECT 
      }
    );

    res.json(turnos);
  } catch (error) {
    console.error('❌ Error en GET /turnos/historial/:idEmpleado:', error);
    res.status(500).json({ error: 'Error al obtener historial de turnos' });
  }
});

export default router;
