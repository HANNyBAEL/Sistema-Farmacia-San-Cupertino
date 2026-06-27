-- Store received payment amounts and card totals for cash closing reports.
SET @ventas_monto_recibido_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ventas'
    AND COLUMN_NAME = 'monto_recibido'
);

SET @sql = IF(@ventas_monto_recibido_exists = 0,
  'ALTER TABLE ventas ADD COLUMN monto_recibido DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER metodo_pago',
  'SELECT ''Column ventas.monto_recibido already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ventas_cambio_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ventas'
    AND COLUMN_NAME = 'cambio'
);

SET @sql = IF(@ventas_cambio_exists = 0,
  'ALTER TABLE ventas ADD COLUMN cambio DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER monto_recibido',
  'SELECT ''Column ventas.cambio already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @turnos_total_tarjeta_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'turnos'
    AND COLUMN_NAME = 'total_tarjeta'
);

SET @sql = IF(@turnos_total_tarjeta_exists = 0,
  'ALTER TABLE turnos ADD COLUMN total_tarjeta DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER total_efectivo',
  'SELECT ''Column turnos.total_tarjeta already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
