const { ensureAuditoriaSchema } = require('./schema');

const getActor = (req = {}) => ({
  usuarioId: Number.isInteger(Number(req.auth?.sub)) ? Number(req.auth.sub) : null,
  usuarioNombre: req.auth?.nombreCompleto || req.auth?.nombreUsuario || req.auth?.email || null,
  ip: req.ip || req.headers?.['x-forwarded-for'] || null
});

const registrarAuditoria = async (runner, {
  req,
  accion,
  entidad,
  entidadId,
  detalle = null
}) => {
  await ensureAuditoriaSchema(runner);
  const actor = getActor(req);

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

module.exports = { getActor, registrarAuditoria };
