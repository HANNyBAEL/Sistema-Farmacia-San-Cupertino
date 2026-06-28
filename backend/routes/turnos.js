import express from 'express';
import sequelize from '../config/database.js';
import { getFechaHoraLocal } from '../utils/fechaLocal.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

const DENOMINACIONES = [
  0.01, 0.05, 0.10, 0.25, 0.50, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00
];

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const validarDenominaciones = (denominaciones) => {
  if (!Array.isArray(denominaciones)) {
    return { error: 'Denominaciones invalidas' };
  }

  const denominacionesValidas = new Set(DENOMINACIONES.map((d) => d.toFixed(2)));
  const normalizadas = [];
  let total = 0;

  for (const den of denominaciones) {
    const denominacion = toMoney(den?.denominacion);
    const cantidad = Number(den?.cantidad);

    if (!denominacionesValidas.has(denominacion.toFixed(2))) {
      return { error: 'La denominacion enviada no es valida' };
    }

    if (!Number.isInteger(cantidad) || cantidad < 0) {
      return { error: 'Las cantidades deben ser numeros enteros mayores o iguales a cero' };
    }

    const monto = toMoney(denominacion * cantidad);
    total = toMoney(total + monto);
    normalizadas.push({ denominacion, cantidad, monto });
  }

  return { normalizadas, total };
};

const obtenerRecaudacionTurno = async (turno, transaction) => {
  const rows = await sequelize.query(
    `SELECT
      COALESCE(SUM(CASE WHEN COALESCE(v.metodo_pago, 'efectivo') = 'efectivo' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) - COALESCE(v.cambio, 0) ELSE 0 END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) ELSE 0 END), 0) as total_tarjeta,
      COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) ELSE 0 END), 0) as total_transferencia,
      COALESCE(SUM(CASE WHEN v.metodo_pago = 'apple_pay' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) ELSE 0 END), 0) as total_apple_pay,
      COALESCE(SUM(CASE WHEN v.metodo_pago = 'paypal' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) ELSE 0 END), 0) as total_paypal,
      COALESCE(SUM(CASE WHEN v.metodo_pago = 'western_union' THEN COALESCE(NULLIF(v.monto_recibido, 0), v.total) ELSE 0 END), 0) as total_western_union,
      COALESCE(SUM(v.total), 0) as recaudacion_total
     FROM turnos t
     LEFT JOIN ventas v
       ON v.id_empleado = t.id_empleado
      AND v.fecha >= t.hora_inicio
      AND v.fecha <= COALESCE(t.hora_cierre, :horaCierre)
     WHERE t.id_turno = :idTurno`,
    {
      replacements: {
        idTurno: turno.id_turno,
        horaCierre: turno.hora_cierre || getFechaHoraLocal()
      },
      type: sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  const rec = rows[0] || {};
  return {
    total_efectivo: toMoney(rec.total_efectivo),
    total_tarjeta: toMoney(rec.total_tarjeta),
    total_transferencia: toMoney(rec.total_transferencia),
    total_apple_pay: toMoney(rec.total_apple_pay),
    total_paypal: toMoney(rec.total_paypal),
    total_western_union: toMoney(rec.total_western_union),
    recaudacion_total: toMoney(rec.recaudacion_total)
  };
};

const obtenerSupervisoraActiva = async (transaction) => {
  const [supervisora] = await sequelize.query(
    `SELECT COALESCE(NULLIF(TRIM(CONCAT(nombre, ' ', apellido)), ''), nombre) AS nombre
     FROM empleados
     WHERE cargo = 'administrador' AND activo = 1 AND papelera = 0
     ORDER BY id_empleado ASC
     LIMIT 1`,
    {
      type: sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  return supervisora?.nombre || '';
};

router.get('/activo', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.id_empleado;

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
    console.error('Error en GET /turnos/activo:', error);
    res.status(500).json({ error: 'Error al verificar turno activo' });
  }
});

router.post('/abrir', authenticate, authorize(['cajero']), async (req, res) => {
  const { denominaciones } = req.body;
  const userId = req.user.id || req.user.id_empleado;
  const userName = `${req.user.nombre || ''} ${req.user.apellido || ''}`.trim() || 'Usuario';
  const userEmail = req.user.correo || 'usuario';

  const transaction = await sequelize.transaction();

  try {
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

    const validacion = validarDenominaciones(denominaciones);
    if (validacion.error) {
      await transaction.rollback();
      return res.status(400).json({ error: validacion.error });
    }

    const fechaHora = getFechaHoraLocal();
    const fecha = fechaHora.split(' ')[0];

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
          cajaInicial: validacion.total
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      }
    );

    const idTurno = turnoResult.insertId ?? turnoResult;

    for (const den of validacion.normalizadas) {
      await sequelize.query(
        `INSERT INTO turno_denominaciones
         (id_turno, denominacion, cantidad, monto, tipo)
         VALUES (:idTurno, :denominacion, :cantidad, :monto, 'apertura')`,
        {
          replacements: {
            idTurno,
            denominacion: den.denominacion,
            cantidad: den.cantidad,
            monto: den.monto
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
      fecha,
      hora_inicio: fechaHora,
      nombre_empleado: userName,
      usuario_pos: userEmail,
      caja_inicial: validacion.total,
      estado: 'abierto'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error en POST /turnos/abrir:', error);
    res.status(500).json({ error: 'Error al abrir turno' });
  }
});

router.get('/recaudacion/:idTurno', authenticate, async (req, res) => {
  try {
    const { idTurno } = req.params;

    const [turno] = await sequelize.query(
      `SELECT
         t.*,
         COALESCE(NULLIF(TRIM(CONCAT(e.nombre, ' ', e.apellido)), ''), t.nombre_empleado) AS nombre_empleado
       FROM turnos t
       LEFT JOIN empleados e ON e.id_empleado = t.id_empleado
       WHERE t.id_turno = :idTurno`,
      {
        replacements: { idTurno },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const turnoParaConsulta = { ...turno, hora_cierre: turno.hora_cierre || getFechaHoraLocal() };
    res.json(await obtenerRecaudacionTurno(turnoParaConsulta));
  } catch (error) {
    console.error('Error en GET /turnos/recaudacion/:idTurno:', error);
    res.status(500).json({ error: 'Error al obtener recaudacion' });
  }
});

router.post('/cerrar', authenticate, authorize(['cajero']), async (req, res) => {
  const { id_turno, denominaciones, observaciones } = req.body;
  const userId = req.user.id || req.user.id_empleado;

  const transaction = await sequelize.transaction();

  try {
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

    if (Number(turno.id_empleado) !== Number(userId)) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No puedes cerrar un turno de otro empleado' });
    }

    const validacion = validarDenominaciones(denominaciones);
    if (validacion.error) {
      await transaction.rollback();
      return res.status(400).json({ error: validacion.error });
    }

    const horaCierre = getFechaHoraLocal();
    const rec = await obtenerRecaudacionTurno({ ...turno, hora_cierre: horaCierre }, transaction);
    const efectivoEsperado = toMoney(toMoney(turno.caja_inicial) + rec.total_efectivo);
    const diferenciaCaja = toMoney(validacion.total - efectivoEsperado);

    await sequelize.query(
      `UPDATE turnos SET
       hora_cierre = :horaCierre,
       caja_final = :cajaFinal,
       total_efectivo = :totalEfectivo,
       total_tarjeta = :totalTarjeta,
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
          cajaFinal: validacion.total,
          totalEfectivo: rec.total_efectivo,
          totalTarjeta: rec.total_tarjeta,
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

    for (const den of validacion.normalizadas) {
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
            monto: den.monto
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
        caja_inicial: toMoney(turno.caja_inicial),
        caja_final: validacion.total,
        efectivo_esperado: efectivoEsperado,
        recaudacion: rec,
        diferencia_caja: diferenciaCaja
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error en POST /turnos/cerrar:', error);
    res.status(500).json({ error: 'Error al cerrar turno' });
  }
});

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
        replacements: { idEmpleado, limite: parseInt(limite, 10) },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json(turnos);
  } catch (error) {
    console.error('Error en GET /turnos/historial/:idEmpleado:', error);
    res.status(500).json({ error: 'Error al obtener historial de turnos' });
  }
});

router.get('/:idTurno', authenticate, async (req, res) => {
  try {
    const { idTurno } = req.params;

    const [turno] = await sequelize.query(
      `SELECT
         t.*,
         COALESCE(NULLIF(TRIM(CONCAT(e.nombre, ' ', e.apellido)), ''), t.nombre_empleado) AS nombre_empleado
       FROM turnos t
       LEFT JOIN empleados e ON e.id_empleado = t.id_empleado
       WHERE t.id_turno = :idTurno`,
      {
        replacements: { idTurno },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const denominacionesApertura = await sequelize.query(
      `SELECT denominacion, cantidad, monto FROM turno_denominaciones
       WHERE id_turno = :idTurno AND tipo = 'apertura'
       ORDER BY denominacion`,
      {
        replacements: { idTurno },
        type: sequelize.QueryTypes.SELECT
      }
    );

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
      ...turno,
      turno,
      supervisor: await obtenerSupervisoraActiva(),
      denominaciones_apertura: denominacionesApertura,
      denominaciones_cierre: denominacionesCierre
    });
  } catch (error) {
    console.error('Error en GET /turnos/:idTurno:', error);
    res.status(500).json({ error: 'Error al obtener detalles del turno' });
  }
});

export default router;
