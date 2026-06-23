-- Migration: Add sesion_activa field to empleados table
-- Description: Prevents two employees from having an open session simultaneously
-- Date: 2026-06-23

ALTER TABLE empleados 
ADD COLUMN sesion_activa BOOLEAN NOT NULL DEFAULT 0 AFTER invitation_expires;

-- Add index for better performance
CREATE INDEX idx_sesion_activa ON empleados(sesion_activa);
