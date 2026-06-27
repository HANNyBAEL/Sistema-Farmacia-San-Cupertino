import sequelize from './config/database.js';

const ensureColumn = async ({ table, column, ddl }) => {
  const [columns] = await sequelize.query(
    `SELECT COUNT(*) as count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );

  if (Number(columns[0].count) > 0) {
    console.log(`La columna ${table}.${column} ya existe`);
    return;
  }

  console.log(`Agregando columna ${table}.${column}...`);
  await sequelize.query(ddl);
  console.log(`Columna ${table}.${column} agregada`);
};

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const recalcularTurnosCerrados = async () => {
  const turnos = await sequelize.query(
    `SELECT id_turno, caja_inicial, caja_final
     FROM turnos
     WHERE estado = 'cerrado'`,
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
      { replacements: { idTurno: turno.id_turno }, type: sequelize.QueryTypes.SELECT }
    );

    const efectivoEsperado = toMoney(turno.caja_inicial) + toMoney(rec.total_efectivo);

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
          diferenciaCaja: toMoney(toMoney(turno.caja_final) - efectivoEsperado)
        }
      }
    );
  }

  console.log(`Turnos cerrados recalculados: ${turnos.length}`);
};

async function runMigration() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexion exitosa');

    await ensureColumn({
      table: 'ventas',
      column: 'metodo_pago',
      ddl: `ALTER TABLE ventas
            ADD COLUMN metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'apple_pay', 'paypal', 'western_union')
            NOT NULL DEFAULT 'efectivo'`
    });

    await ensureColumn({
      table: 'ventas',
      column: 'monto_recibido',
      ddl: `ALTER TABLE ventas
            ADD COLUMN monto_recibido DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER metodo_pago`
    });

    await ensureColumn({
      table: 'ventas',
      column: 'cambio',
      ddl: `ALTER TABLE ventas
            ADD COLUMN cambio DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER monto_recibido`
    });

    await ensureColumn({
      table: 'turnos',
      column: 'total_tarjeta',
      ddl: `ALTER TABLE turnos
            ADD COLUMN total_tarjeta DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER total_efectivo`
    });

    await recalcularTurnosCerrados();

    console.log('Migracion completada');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar migracion:', error);
    process.exit(1);
  }
}

runMigration();
