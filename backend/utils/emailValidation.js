const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validateEmailOrThrow(email, { required = true } = {}) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    if (required) {
      const error = new Error('El correo electronico es obligatorio.');
      error.status = 400;
      throw error;
    }
    return null;
  }

  if (!EMAIL_REGEX.test(normalized)) {
    const error = new Error('El correo electronico no tiene un formato valido.');
    error.status = 400;
    throw error;
  }

  return normalized;
}

export async function ensureEmailIsUnique(sequelize, table, email, idColumn, idToExclude = null) {
  const normalized = normalizeEmail(email);
  const replacements = { correo: normalized };
  let query = `SELECT ${idColumn} AS id FROM ${table} WHERE LOWER(correo) = :correo`;

  if (idToExclude !== null && idToExclude !== undefined) {
    query += ` AND ${idColumn} <> :idToExclude`;
    replacements.idToExclude = Number(idToExclude);
  }

  const [existing] = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  if (existing) {
    const error = new Error('El correo electronico ya esta registrado.');
    error.status = 409;
    throw error;
  }
}

export function handleEmailValidationError(error, res) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return null;
}
