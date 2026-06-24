-- Migration: Change fecha column from DATE to DATETIME in ventas table
-- Description: Allows storing both date and time for sales records
-- Date: 2026-06-23

ALTER TABLE ventas 
MODIFY COLUMN fecha DATETIME NOT NULL;
