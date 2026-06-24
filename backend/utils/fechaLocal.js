const OFFSET_EL_SALVADOR = -6 * 60; // minutos, UTC‑6

/**
 * Formatea un número a dos dígitos (ej: 5 → "05").
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Fecha y hora actual en El Salvador (YYYY-MM-DD HH:mm:ss).
 * Calculado manualmente a partir del offset UTC‑6, sin depender de locales.
 */
export function getFechaHoraLocal() {
  const now = new Date();
  // Convertir la hora UTC actual a minutos y aplicar el offset
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let localMinutes = utcMinutes + OFFSET_EL_SALVADOR;
  // Ajustar el día si nos pasamos de 24h o caemos en negativo (no ocurre con UTC‑6 pero por robustez)
  let dayOffset = 0;
  while (localMinutes < 0) {
    localMinutes += 1440;
    dayOffset--;
  }
  while (localMinutes >= 1440) {
    localMinutes -= 1440;
    dayOffset++;
  }
  const localHour = Math.floor(localMinutes / 60);
  const localMinute = localMinutes % 60;
  const localSecond = now.getUTCSeconds();

  // Ajustar la fecha si es necesario
  const localDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + dayOffset
  ));

  const year = localDate.getUTCFullYear();
  const month = pad(localDate.getUTCMonth() + 1);
  const day = pad(localDate.getUTCDate());
  const hour = pad(localHour);
  const minute = pad(localMinute);
  const second = pad(localSecond);

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/** Solo la fecha de hoy en El Salvador (YYYY-MM-DD). */
export function getHoyLocal() {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let localMinutes = utcMinutes + OFFSET_EL_SALVADOR;
  let dayOffset = 0;
  while (localMinutes < 0) { localMinutes += 1440; dayOffset--; }
  while (localMinutes >= 1440) { localMinutes -= 1440; dayOffset++; }
  const localDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + dayOffset
  ));
  return `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`;
}