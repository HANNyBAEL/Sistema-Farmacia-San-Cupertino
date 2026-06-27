-- Create turno_denominaciones table
CREATE TABLE IF NOT EXISTS turno_denominaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_turno INT NOT NULL,
  denominacion DECIMAL(10, 2) NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  monto DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  tipo ENUM('apertura', 'cierre') NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_turno) REFERENCES turnos(id_turno) ON DELETE CASCADE,
  UNIQUE KEY unique_turno_denominacion_tipo (id_turno, denominacion, tipo),
  INDEX idx_turno (id_turno),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
