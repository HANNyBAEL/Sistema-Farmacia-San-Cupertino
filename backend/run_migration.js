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

    console.log('Migracion completada');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar migracion:', error);
    process.exit(1);
  }
}

runMigration();
