const { ensureAuditoriaSchema } = require('./schema');

const getActor = (req = {}) => ({
  usuarioId: Number.isInteger(Number(req.auth?.sub)) ? Number(req.auth.sub) : null,
  usuarioNombre: req.auth?.nombreCompleto || req.auth?.nombreUsuario || req.auth?.email || null,
  tipo: req.auth?.type || null,
  ip: req.ip || req.headers?.['x-forwarded-for'] || null
});

const resolveActor = async (runner, req = {}) => {
  const actor = getActor(req);
  if (actor.usuarioNombre || !actor.usuarioId) return actor;

  if (actor.tipo === 'cliente') {
    const [rows] = await runner.query(
      'SELECT nombre_completo, email FROM clientes WHERE id = ? LIMIT 1',
      [actor.usuarioId]
    );
    return {
      ...actor,
      usuarioNombre: rows[0]?.nombre_completo || rows[0]?.email || `Cliente ${actor.usuarioId}`
    };
  }

  const [rows] = await runner.query(
    'SELECT nombre_completo, nombre_usuario, email FROM usuarios WHERE id = ? LIMIT 1',
    [actor.usuarioId]
  );
  return {
    ...actor,
    usuarioNombre: rows[0]?.nombre_completo || rows[0]?.nombre_usuario || rows[0]?.email || `Usuario ${actor.usuarioId}`
  };
};

const registrarAuditoria = async (runner, {
  req,
  accion,
  entidad,
  entidadId,
  detalle = null
}) => {
  await ensureAuditoriaSchema(runner);
  const actor = await resolveActor(runner, req);

  await runner.execute(
    `INSERT INTO auditoria_logs
      (usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      actor.usuarioId,
      actor.usuarioNombre,
      accion,
      entidad,
      entidadId === undefined || entidadId === null ? null : String(entidadId),
      detalle === null ? null : JSON.stringify(detalle),
      actor.ip
    ]
  );
};

module.exports = { getActor, resolveActor, registrarAuditoria };
