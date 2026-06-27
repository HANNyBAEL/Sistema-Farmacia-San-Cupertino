import sequelize from '../config/database.js';

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

async function recalcularTurnos() {
  try {
    await sequelize.authenticate();

    const turnos = await sequelize.query(
      `SELECT id_turno, caja_inicial, caja_final
       FROM turnos
       WHERE estado = 'cerrado'
       ORDER BY id_turno`,
      { type: sequelize.QueryTypes.SELECT }
    );

    for (const turno of turnos) {
      const [rec] = await sequelize.query(
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
          AND v.fecha <= t.hora_cierre
         WHERE t.id_turno = :idTurno`,
        {
          replacements: { idTurno: turno.id_turno },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const efectivoEsperado = toMoney(turno.caja_inicial) + toMoney(rec.total_efectivo);
      const diferenciaCaja = toMoney(toMoney(turno.caja_final) - efectivoEsperado);

      await sequelize.query(
        `UPDATE turnos SET
          total_efectivo = :totalEfectivo,
          total_tarjeta = :totalTarjeta,
          total_transferencia = :totalTransferencia,
          total_apple_pay = :totalApplePay,
          total_paypal = :totalPaypal,
          total_western_union = :totalWesternUnion,
          recaudacion_total = :recaudacionTotal,
          diferencia_caja = :diferenciaCaja
         WHERE id_turno = :idTurno`,
        {
          replacements: {
            idTurno: turno.id_turno,
            totalEfectivo: toMoney(rec.total_efectivo),
            totalTarjeta: toMoney(rec.total_tarjeta),
            totalTransferencia: toMoney(rec.total_transferencia),
            totalApplePay: toMoney(rec.total_apple_pay),
            totalPaypal: toMoney(rec.total_paypal),
            totalWesternUnion: toMoney(rec.total_western_union),
            recaudacionTotal: toMoney(rec.recaudacion_total),
            diferenciaCaja
          }
        }
      );
    }

    console.log(`Turnos recalculados: ${turnos.length}`);
  } catch (error) {
    console.error('Error al recalcular turnos:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

recalcularTurnos();
