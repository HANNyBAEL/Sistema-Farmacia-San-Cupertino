-- Migration: Fix trigger to use NOW() instead of CURDATE() for ventas.fecha
-- Description: The trigger trg_proteger_campos_venta_auto was using CURDATE() which only returns date without time
--              Changed to NOW() to preserve the time sent by the backend
--              Also removed id_empleado logic since backend already sends it correctly
-- Date: 2026-06-23

DROP TRIGGER IF EXISTS trg_proteger_campos_venta_auto;

DELIMITER $$

CREATE TRIGGER trg_proteger_campos_venta_auto
BEFORE INSERT ON ventas
FOR EACH ROW
BEGIN
    -- Use NOW() instead of CURDATE() to preserve date and time
    SET NEW.fecha = NOW();

    IF NEW.total IS NULL OR NEW.total < 0 THEN
        SET NEW.total = 0.00;
    END IF;
END$$

DELIMITER ;
