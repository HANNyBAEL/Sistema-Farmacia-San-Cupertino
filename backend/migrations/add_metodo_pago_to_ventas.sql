-- Add metodo_pago column to ventas table
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'ventas' 
    AND COLUMN_NAME = 'metodo_pago'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE ventas ADD COLUMN metodo_pago ENUM(''efectivo'', ''tarjeta'', ''transferencia'', ''apple_pay'', ''paypal'', ''western_union'') NOT NULL DEFAULT ''efectivo''',
  'SELECT ''Column metodo_pago already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
