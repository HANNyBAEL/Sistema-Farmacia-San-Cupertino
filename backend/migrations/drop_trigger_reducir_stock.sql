-- Migration: Drop trigger trg_reducir_stock
-- Description: Eliminar trigger que duplicaba el descuento de stock
--              El backend ya maneja la actualización de stock en la transacción
-- Date: 2026-06-25

DROP TRIGGER IF EXISTS trg_reducir_stock;
