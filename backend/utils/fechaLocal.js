const TIMEZONE = 'America/El_Salvador';

/**
 * Fecha y hora actual en El Salvador (YYYY-MM-DD HH:mm:ss).
 * Usar siempre en el servidor para ventas, KPIs y reportes.
 */
export function getFechaHoraLocal() {
  const now = new Date();
  const fecha = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  let hora = now.toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  if (hora.startsWith('24:')) hora = '00:' + hora.slice(3);
  return `${fecha} ${hora}`;
}

/** Solo la fecha de hoy en El Salvador (YYYY-MM-DD). */
export function getHoyLocal() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}
