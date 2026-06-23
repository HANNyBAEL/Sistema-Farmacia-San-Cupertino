// ─── SESSION MANAGEMENT ROUTES ────────────────────────────────────────────────
// These routes should be added to backend/routes/auth.js after running the migration
// File: backend/migrations/add_sesion_activa_to_empleados.sql

import { authenticate } from '../middleware/auth.js';

// ─── MODIFICATIONS NEEDED IN auth.js ──────────────────────────────────────────
// 1. In the login route (around line 80-91), modify the SELECT query to include sesion_activa:
//    `SELECT id_empleado, nombre, apellido, correo, password_hash, cargo, activo, papelera, token_version, sesion_activa`
//
// 2. After the password validation (around line 91), add session check:
//    if (user.sesion_activa !== undefined && user.sesion_activa === 1) {
//      return res.status(403).json({ error: 'Este empleado ya tiene una sesión activa. Contacte al administrador.' });
//    }
//
// 3. After successful login (around line 97), add session activation:
//    if (user.sesion_activa !== undefined) {
//      await sequelize.query(
//        `UPDATE empleados SET sesion_activa = 1 WHERE id_empleado = ?`,
//        { replacements: [user.id_empleado], type: sequelize.QueryTypes.UPDATE }
//      );
//    }

// ─── ADD THIS ROUTE TO auth.js ─────────────────────────────────────────────────
// Add this route before the export at the end of auth.js
/*
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    // Clear session_active flag when user logs out
    await sequelize.query(
      `UPDATE empleados SET sesion_activa = 0 WHERE id_empleado = ?`,
      { replacements: [userId], type: sequelize.QueryTypes.UPDATE }
    );
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});
*/

// ─── OPTIONAL: ADMIN ROUTES TO MANAGE SESSIONS ──────────────────────────────────
// Add these routes if you want administrators to be able to force logout employees
/*
// Force logout a specific employee (admin only)
router.post('/force-logout/:id', authenticate, authorize(['administrador']), async (req, res) => {
  try {
    const employeeId = req.params.id;
    await sequelize.query(
      `UPDATE empleados SET sesion_activa = 0, token_version = token_version + 1 WHERE id_empleado = ?`,
      { replacements: [employeeId], type: sequelize.QueryTypes.UPDATE }
    );
    res.json({ message: 'Sesión del empleado cerrada forzosamente' });
  } catch (error) {
    console.error('❌ Error en force-logout:', error);
    res.status(500).json({ error: 'Error al cerrar sesión del empleado' });
  }
});

// Check if an employee has an active session (admin only)
router.get('/check-session/:id', authenticate, authorize(['administrador']), async (req, res) => {
  try {
    const employeeId = req.params.id;
    const [result] = await sequelize.query(
      `SELECT sesion_activa FROM empleados WHERE id_empleado = ?`,
      { replacements: [employeeId], type: sequelize.QueryTypes.SELECT }
    );
    res.json({ hasActiveSession: result?.sesion_activa === 1 });
  } catch (error) {
    console.error('❌ Error en check-session:', error);
    res.status(500).json({ error: 'Error al verificar sesión' });
  }
});
*/

export { authenticate };
