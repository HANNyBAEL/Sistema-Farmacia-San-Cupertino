import sequelize from './config/database.js';

async function runMigration() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    // Check if column exists
    const [columns] = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'ventas' 
         AND COLUMN_NAME = 'metodo_pago'`
    );
    
    const columnExists = columns[0].count > 0;

    if (columnExists) {
      console.log('ℹ️  Columna metodo_pago ya existe');
      process.exit(0);
    }

    console.log('🔄 Agregando columna metodo_pago...');
    await sequelize.query(
      `ALTER TABLE ventas 
       ADD COLUMN metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'apple_pay', 'paypal', 'western_union') 
       NOT NULL DEFAULT 'efectivo'`
    );
    console.log('✅ Columna metodo_pago agregada exitosamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error);
    process.exit(1);
  }
}

runMigration();
