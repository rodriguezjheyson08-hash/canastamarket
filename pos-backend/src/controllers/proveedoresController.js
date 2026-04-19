const axios = require('axios');
const pool = require('../db/pool');
const { consultarRuc } = require('../apidni/rucService');
const { ensureProveedoresSchema } = require('../utils/ensureProveedoresSchema');

const isRucValido = (ruc) => /^\d{11}$/.test(String(ruc || '').trim());
const normalizePhoneDigits = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
};

const safeJsonParse = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const serializeOptionalJson = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const toOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
};

const normalizeProveedorRow = (row) => ({
  id: row.id,
  numeroDocumento: row.numero_documento,
  razonSocial: row.razon_social,
  estado: row.estado,
  condicion: row.condicion,
  direccion: row.direccion,
  ubigeo: row.ubigeo,
  viaTipo: row.via_tipo,
  viaNombre: row.via_nombre,
  zonaCodigo: row.zona_codigo,
  zonaTipo: row.zona_tipo,
  numero: row.numero,
  interior: row.interior,
  lote: row.lote,
  dpto: row.dpto,
  manzana: row.manzana,
  kilometro: row.kilometro,
  distrito: row.distrito,
  provincia: row.provincia,
  departamento: row.departamento,
  tipo: row.tipo,
  actividadEconomica: row.actividad_economica,
  numeroTrabajadores: row.numero_trabajadores !== null && row.numero_trabajadores !== undefined ? Number(row.numero_trabajadores) : null,
  tipoFacturacion: row.tipo_facturacion,
  tipoContabilidad: row.tipo_contabilidad,
  comercioExterior: row.comercio_exterior,
  esAgenteRetencion: row.es_agente_retencion === null || row.es_agente_retencion === undefined ? null : row.es_agente_retencion === 1,
  esBuenContribuyente: row.es_buen_contribuyente === null || row.es_buen_contribuyente === undefined ? null : row.es_buen_contribuyente === 1,
  localesAnexos: safeJsonParse(row.locales_anexos),
  contactoNombre: row.contacto_nombre,
  contactoTelefono: row.contacto_telefono,
  contactoEmail: row.contacto_email,
  activo: row.activo === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const normalizeRucApiData = (inputRuc, data) => {
  const numeroDocumento = String(data?.numero_documento || data?.ruc || data?.numero || inputRuc || '').trim();
  const razonSocial = String(data?.razon_social || data?.nombre || data?.razonSocial || '').trim();
  const estado = String(data?.estado || '').trim() || null;
  const condicion = String(data?.condicion || '').trim() || null;
  const direccion = String(data?.direccion || '').trim() || null;
  const ubigeo = String(data?.ubigeo || '').trim() || null;
  const viaTipo = String(data?.via_tipo || '').trim() || null;
  const viaNombre = String(data?.via_nombre || '').trim() || null;
  const zonaCodigo = String(data?.zona_codigo || '').trim() || null;
  const zonaTipo = String(data?.zona_tipo || data?.zona_nombre || '').trim() || null;
  const numero = String(data?.numero || '').trim() || null;
  const interior = String(data?.interior || '').trim() || null;
  const lote = String(data?.lote || '').trim() || null;
  const dpto = String(data?.dpto || data?.departamento_numero || '').trim() || null;
  const manzana = String(data?.manzana || '').trim() || null;
  const kilometro = String(data?.kilometro || '').trim() || null;
  const distrito = String(data?.distrito || '').trim() || null;
  const provincia = String(data?.provincia || '').trim() || null;
  const departamento = String(data?.departamento || '').trim() || null;
  const tipo = String(data?.tipo || '').trim() || null;
  const actividadEconomica = String(data?.actividad_economica || '').trim() || null;
  const numeroTrabajadores = data?.numero_trabajadores !== undefined && data?.numero_trabajadores !== null
    ? Number(String(data.numero_trabajadores).trim())
    : null;
  const tipoFacturacion = String(data?.tipo_facturacion || '').trim() || null;
  const tipoContabilidad = String(data?.tipo_contabilidad || '').trim() || null;
  const comercioExterior = String(data?.comercio_exterior || '').trim() || null;
  const esAgenteRetencion =
    typeof data?.es_agente_retencion === 'boolean' ? data.es_agente_retencion : null;
  const esBuenContribuyente =
    typeof data?.es_buen_contribuyente === 'boolean' ? data.es_buen_contribuyente : null;
  const localesAnexos = data?.locales_anexos !== undefined ? data.locales_anexos : null;

  return {
    numero_documento: numeroDocumento,
    razon_social: razonSocial,
    estado,
    condicion,
    direccion,
    ubigeo,
    via_tipo: viaTipo,
    via_nombre: viaNombre,
    zona_codigo: zonaCodigo,
    zona_tipo: zonaTipo,
    numero,
    interior,
    lote,
    dpto,
    manzana,
    kilometro,
    distrito,
    provincia,
    departamento,
    tipo,
    actividad_economica: actividadEconomica,
    numero_trabajadores: Number.isFinite(numeroTrabajadores) ? numeroTrabajadores : null,
    tipo_facturacion: tipoFacturacion,
    tipo_contabilidad: tipoContabilidad,
    comercio_exterior: comercioExterior,
    es_agente_retencion: esAgenteRetencion,
    es_buen_contribuyente: esBuenContribuyente,
    locales_anexos: localesAnexos
  };
};

const listProveedores = async (_req, res) => {
  await ensureProveedoresSchema();
  const [rows] = await pool.query(
    `SELECT id, numero_documento, razon_social, estado, condicion, direccion, ubigeo,
            via_tipo, via_nombre, zona_codigo, zona_tipo, numero, interior, lote, dpto, manzana, kilometro,
            distrito, provincia, departamento, tipo, actividad_economica, numero_trabajadores,
            tipo_facturacion, tipo_contabilidad, comercio_exterior, es_agente_retencion, es_buen_contribuyente, locales_anexos,
            contacto_nombre, contacto_telefono, contacto_email, activo, created_at, updated_at
       FROM proveedores
      WHERE activo = 1
      ORDER BY razon_social`
  );
  res.json(rows.map(normalizeProveedorRow));
};

const getProveedorByRuc = async (req, res) => {
  await ensureProveedoresSchema();
  const ruc = req.params.ruc || req.query.ruc;
  if (!isRucValido(ruc)) {
    return res.status(400).json({ message: 'El RUC debe tener 11 dígitos.' });
  }
  const [rows] = await pool.query(
    `SELECT id, numero_documento, razon_social, estado, condicion, direccion, ubigeo,
            via_tipo, via_nombre, zona_codigo, zona_tipo, numero, interior, lote, dpto, manzana, kilometro,
            distrito, provincia, departamento, tipo, actividad_economica, numero_trabajadores,
            tipo_facturacion, tipo_contabilidad, comercio_exterior, es_agente_retencion, es_buen_contribuyente, locales_anexos,
            contacto_nombre, contacto_telefono, contacto_email, activo, created_at, updated_at
       FROM proveedores
      WHERE numero_documento = ? LIMIT 1`,
    [String(ruc).trim()]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Proveedor no encontrado.' });
  res.json(normalizeProveedorRow(rows[0]));
};

const createProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const {
    numeroDocumento,
    razonSocial,
    estado,
    condicion,
    direccion,
    ubigeo,
    viaTipo,
    viaNombre,
    zonaCodigo,
    zonaTipo,
    numero,
    interior,
    lote,
    dpto,
    manzana,
    kilometro,
    distrito,
    provincia,
    departamento,
    tipo,
    actividadEconomica,
    numeroTrabajadores,
    tipoFacturacion,
    tipoContabilidad,
    comercioExterior,
    esAgenteRetencion,
    esBuenContribuyente,
    localesAnexos,
    contactoNombre,
	  contactoTelefono,
	  contactoEmail
	} = req.body || {};

  if (!isRucValido(numeroDocumento)) {
    return res.status(400).json({ message: 'numeroDocumento (RUC) debe tener 11 dígitos.' });
  }
	if (!razonSocial || String(razonSocial).trim() === '') {
	  return res.status(400).json({ message: 'razonSocial es obligatorio.' });
	}

	const cleanContactoTelefono = normalizePhoneDigits(contactoTelefono);
	if (cleanContactoTelefono && !/^\d{9}$/.test(cleanContactoTelefono)) {
	  return res.status(400).json({ message: 'contactoTelefono debe tener 9 dígitos.' });
	}

	try {
	  const [result] = await pool.execute(
      `INSERT INTO proveedores
        (numero_documento, razon_social, estado, condicion, direccion, ubigeo,
         via_tipo, via_nombre, zona_codigo, zona_tipo, numero, interior, lote, dpto, manzana, kilometro,
         distrito, provincia, departamento, tipo, actividad_economica, numero_trabajadores,
         tipo_facturacion, tipo_contabilidad, comercio_exterior, es_agente_retencion, es_buen_contribuyente, locales_anexos,
         contacto_nombre, contacto_telefono, contacto_email, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(numeroDocumento).trim(),
        String(razonSocial).trim(),
        estado || null,
        condicion || null,
        direccion || null,
        ubigeo || null,
        viaTipo || null,
        viaNombre || null,
        zonaCodigo || null,
        zonaTipo || null,
        numero || null,
        interior || null,
        lote || null,
        dpto || null,
        manzana || null,
        kilometro || null,
        distrito || null,
        provincia || null,
        departamento || null,
        tipo || null,
        actividadEconomica || null,
        toOptionalInt(numeroTrabajadores),
        tipoFacturacion || null,
        tipoContabilidad || null,
        comercioExterior || null,
        typeof esAgenteRetencion === 'boolean' ? (esAgenteRetencion ? 1 : 0) : null,
	        typeof esBuenContribuyente === 'boolean' ? (esBuenContribuyente ? 1 : 0) : null,
	        serializeOptionalJson(localesAnexos),
	        contactoNombre || null,
	        cleanContactoTelefono,
	        contactoEmail || null,
	        1
	      ]
	    );

    const [rows] = await pool.query(
      `SELECT id, numero_documento, razon_social, estado, condicion, direccion, ubigeo,
              via_tipo, via_nombre, zona_codigo, zona_tipo, numero, interior, lote, dpto, manzana, kilometro,
              distrito, provincia, departamento, tipo, actividad_economica, numero_trabajadores,
              tipo_facturacion, tipo_contabilidad, comercio_exterior, es_agente_retencion, es_buen_contribuyente, locales_anexos,
              contacto_nombre, contacto_telefono, contacto_email, activo, created_at, updated_at
         FROM proveedores WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(normalizeProveedorRow(rows[0]));
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un proveedor con ese RUC.' });
    }
    throw error;
  }
};

const updateProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const { id } = req.params;
  const {
    numeroDocumento,
    razonSocial,
    estado,
    condicion,
    direccion,
    ubigeo,
    viaTipo,
    viaNombre,
    zonaCodigo,
    zonaTipo,
    numero,
    interior,
    lote,
    dpto,
    manzana,
    kilometro,
    distrito,
    provincia,
    departamento,
    tipo,
    actividadEconomica,
    numeroTrabajadores,
    tipoFacturacion,
    tipoContabilidad,
    comercioExterior,
    esAgenteRetencion,
    esBuenContribuyente,
    localesAnexos,
    contactoNombre,
    contactoTelefono,
    contactoEmail,
    activo
  } = req.body || {};

  if (numeroDocumento !== undefined && !isRucValido(numeroDocumento)) {
    return res.status(400).json({ message: 'numeroDocumento (RUC) debe tener 11 dígitos.' });
  }

	if (razonSocial !== undefined && String(razonSocial).trim() === '') {
	  return res.status(400).json({ message: 'razonSocial no puede estar vacío.' });
	}

	const cleanContactoTelefono = contactoTelefono === undefined ? null : normalizePhoneDigits(contactoTelefono);
	if (cleanContactoTelefono && !/^\d{9}$/.test(cleanContactoTelefono)) {
	  return res.status(400).json({ message: 'contactoTelefono debe tener 9 dígitos.' });
	}

	try {
	  const [result] = await pool.execute(
      `UPDATE proveedores SET
        numero_documento = COALESCE(?, numero_documento),
        razon_social = COALESCE(?, razon_social),
        estado = COALESCE(?, estado),
        condicion = COALESCE(?, condicion),
        direccion = COALESCE(?, direccion),
        ubigeo = COALESCE(?, ubigeo),
        via_tipo = COALESCE(?, via_tipo),
        via_nombre = COALESCE(?, via_nombre),
        zona_codigo = COALESCE(?, zona_codigo),
        zona_tipo = COALESCE(?, zona_tipo),
        numero = COALESCE(?, numero),
        interior = COALESCE(?, interior),
        lote = COALESCE(?, lote),
        dpto = COALESCE(?, dpto),
        manzana = COALESCE(?, manzana),
        kilometro = COALESCE(?, kilometro),
        distrito = COALESCE(?, distrito),
        provincia = COALESCE(?, provincia),
        departamento = COALESCE(?, departamento),
        tipo = COALESCE(?, tipo),
        actividad_economica = COALESCE(?, actividad_economica),
        numero_trabajadores = COALESCE(?, numero_trabajadores),
        tipo_facturacion = COALESCE(?, tipo_facturacion),
        tipo_contabilidad = COALESCE(?, tipo_contabilidad),
        comercio_exterior = COALESCE(?, comercio_exterior),
        es_agente_retencion = COALESCE(?, es_agente_retencion),
        es_buen_contribuyente = COALESCE(?, es_buen_contribuyente),
        locales_anexos = COALESCE(?, locales_anexos),
        contacto_nombre = COALESCE(?, contacto_nombre),
        contacto_telefono = COALESCE(?, contacto_telefono),
        contacto_email = COALESCE(?, contacto_email),
        activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        numeroDocumento === undefined ? null : String(numeroDocumento).trim(),
        razonSocial === undefined ? null : String(razonSocial).trim(),
        estado === undefined ? null : estado,
        condicion === undefined ? null : condicion,
        direccion === undefined ? null : direccion,
        ubigeo === undefined ? null : ubigeo,
        viaTipo === undefined ? null : viaTipo,
        viaNombre === undefined ? null : viaNombre,
        zonaCodigo === undefined ? null : zonaCodigo,
        zonaTipo === undefined ? null : zonaTipo,
        numero === undefined ? null : numero,
        interior === undefined ? null : interior,
        lote === undefined ? null : lote,
        dpto === undefined ? null : dpto,
        manzana === undefined ? null : manzana,
        kilometro === undefined ? null : kilometro,
        distrito === undefined ? null : distrito,
        provincia === undefined ? null : provincia,
        departamento === undefined ? null : departamento,
        tipo === undefined ? null : tipo,
        actividadEconomica === undefined ? null : actividadEconomica,
        toOptionalInt(numeroTrabajadores),
        tipoFacturacion === undefined ? null : tipoFacturacion,
        tipoContabilidad === undefined ? null : tipoContabilidad,
        comercioExterior === undefined ? null : comercioExterior,
        typeof esAgenteRetencion === 'boolean' ? (esAgenteRetencion ? 1 : 0) : null,
	        typeof esBuenContribuyente === 'boolean' ? (esBuenContribuyente ? 1 : 0) : null,
	        serializeOptionalJson(localesAnexos),
	        contactoNombre === undefined ? null : contactoNombre,
	        contactoTelefono === undefined ? null : cleanContactoTelefono,
	        contactoEmail === undefined ? null : contactoEmail,
	        activo === undefined ? null : (activo ? 1 : 0),
	        id
	      ]
	    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    const [rows] = await pool.query(
      `SELECT id, numero_documento, razon_social, estado, condicion, direccion, ubigeo,
              via_tipo, via_nombre, zona_codigo, zona_tipo, numero, interior, lote, dpto, manzana, kilometro,
              distrito, provincia, departamento, tipo, actividad_economica, numero_trabajadores,
              tipo_facturacion, tipo_contabilidad, comercio_exterior, es_agente_retencion, es_buen_contribuyente, locales_anexos,
              contacto_nombre, contacto_telefono, contacto_email, activo, created_at, updated_at
         FROM proveedores WHERE id = ?`,
      [id]
    );

    res.json(normalizeProveedorRow(rows[0]));
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un proveedor con ese RUC.' });
    }
    throw error;
  }
};

const deleteProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const { id } = req.params;
  const [result] = await pool.execute('UPDATE proveedores SET activo = 0 WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Proveedor no encontrado.' });
  }

  res.status(204).send();
};

const consultarRucApi = async (req, res) => {
  const ruc = req.params.ruc || req.query.ruc;
  if (!isRucValido(ruc)) {
    return res.status(400).json({ message: 'El RUC debe tener 11 dígitos.' });
  }

  try {
    const data = await consultarRuc(String(ruc).trim());
    res.json(normalizeRucApiData(ruc, data));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'No se pudo consultar RUC.';
      return res.status(status).json({ message, details: error.response?.data });
    }
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || 'No se pudo consultar RUC.' });
  }
};

const mapPedidoCompraRow = (row) => ({
  id: row.id,
  proveedorId: row.proveedor_id,
  estado: row.estado,
  notas: row.notas,
  fecha: row.fecha,
  updatedAt: row.updated_at,
  itemsCount: row.items_count !== undefined ? Number(row.items_count) : undefined,
  totalCantidad: row.total_cantidad !== undefined ? Number(row.total_cantidad) : undefined,
  proveedor: {
    id: row.proveedor_id,
    numeroDocumento: row.numero_documento,
    razonSocial: row.razon_social,
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoEmail: row.contacto_email,
    direccion: row.direccion
  }
});

const resetPedidosCompraAutoIncrementIfEmpty = async (runner = pool) => {
  const [rows] = await runner.query('SELECT COUNT(*) AS total FROM pedidos_compra');
  const total = Number(rows[0]?.total || 0);
  if (total === 0) {
    await runner.query('ALTER TABLE pedidos_compra AUTO_INCREMENT = 1');
    await runner.query('ALTER TABLE pedidos_compra_detalles AUTO_INCREMENT = 1');
  }
};

const listPedidosCompra = async (_req, res) => {
  await ensureProveedoresSchema();
  const [rows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion,
            (SELECT COUNT(*) FROM pedidos_compra_detalles d WHERE d.pedido_compra_id = pc.id) AS items_count,
            (SELECT COALESCE(SUM(d.cantidad), 0) FROM pedidos_compra_detalles d WHERE d.pedido_compra_id = pc.id) AS total_cantidad
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      ORDER BY pc.fecha DESC
      LIMIT 200`
  );
  res.json(rows.map(mapPedidoCompraRow));
};

const getPedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      WHERE pc.id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });

  const pedido = mapPedidoCompraRow(rows[0]);
  const [detRows] = await pool.query(
    `SELECT d.id, d.producto_id, d.cantidad, pr.nombre, pr.stock_actual, pr.stock_minimo
       FROM pedidos_compra_detalles d
       JOIN productos pr ON pr.id = d.producto_id
      WHERE d.pedido_compra_id = ?
      ORDER BY pr.nombre`,
    [id]
  );

  pedido.items = detRows.map((r) => ({
    id: r.id,
    productoId: r.producto_id,
    productoNombre: r.nombre,
    cantidad: Number(r.cantidad),
    stockActual: Number(r.stock_actual),
    stockMinimo: Number(r.stock_minimo)
  }));

  res.json(pedido);
};

const createPedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const { proveedorId, items, notas } = req.body || {};

  if (!proveedorId) {
    return res.status(400).json({ message: 'proveedorId es obligatorio.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items es obligatorio (lista de productos a pedir).' });
  }

  const normalizedItems = items
    .map((it) => ({
      productoId: Number(it?.productoId),
      cantidad: Number(it?.cantidad)
    }))
    .filter((it) => Number.isFinite(it.productoId) && it.productoId > 0 && Number.isFinite(it.cantidad) && it.cantidad > 0);

  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: 'items no tiene productos válidos.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [provRows] = await conn.query('SELECT id FROM proveedores WHERE id = ? AND activo = 1 LIMIT 1', [proveedorId]);
    if (provRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    const [pedidoResult] = await conn.execute(
      'INSERT INTO pedidos_compra (proveedor_id, estado, notas) VALUES (?, ?, ?)',
      [proveedorId, 'BORRADOR', notas || null]
    );
    const pedidoId = pedidoResult.insertId;

    for (const it of normalizedItems) {
      await conn.execute(
        'INSERT INTO pedidos_compra_detalles (pedido_compra_id, producto_id, cantidad) VALUES (?, ?, ?)',
        [pedidoId, it.productoId, it.cantidad]
      );
    }

    await conn.commit();

    // Reusar handler de detalle
    req.params.id = String(pedidoId);
    return getPedidoCompra(req, res);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    throw error;
  } finally {
    conn.release();
  }
};

const deletePedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const pedidoId = Number(req.params.id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'ID de pedido inválido.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM pedidos_compra_detalles WHERE pedido_compra_id = ?', [pedidoId]);
    const [result] = await conn.execute('DELETE FROM pedidos_compra WHERE id = ?', [pedidoId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Pedido de compra no encontrado.' });
    }

    await resetPedidosCompraAutoIncrementIfEmpty(conn);
    await conn.commit();
    res.status(204).send();
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    throw error;
  } finally {
    conn.release();
  }
};

const deletePedidosCompraBatch = async (req, res) => {
  await ensureProveedoresSchema();
  const rawIds = req.body?.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return res.status(400).json({ message: 'Debes enviar un arreglo de IDs.' });
  }

  const ids = [...new Set(
    rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

  if (ids.length === 0) {
    return res.status(400).json({ message: 'No se recibieron IDs válidos.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM pedidos_compra_detalles WHERE pedido_compra_id IN (?)', [ids]);
    const [result] = await conn.query('DELETE FROM pedidos_compra WHERE id IN (?)', [ids]);
    await resetPedidosCompraAutoIncrementIfEmpty(conn);
    await conn.commit();
    return res.json({ deleted: Number(result.affectedRows || 0), ids });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    throw error;
  } finally {
    conn.release();
  }
};

const csvEscape = (value) => {
  const raw = value === null || value === undefined ? '' : String(value);
  const needsQuotes = /[;"\n\r]/.test(raw);
  const escaped = raw.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

const downloadPedidoCsv = async (req, res) => {
  await ensureProveedoresSchema();
  const { id } = req.params;

  const [pedidoRows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      WHERE pc.id = ? LIMIT 1`,
    [id]
  );
  if (pedidoRows.length === 0) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });

  const [detRows] = await pool.query(
    `SELECT d.producto_id, d.cantidad, pr.nombre
       FROM pedidos_compra_detalles d
       JOIN productos pr ON pr.id = d.producto_id
      WHERE d.pedido_compra_id = ?
      ORDER BY pr.nombre`,
    [id]
  );

  const pedido = pedidoRows[0];
  const lines = [];
  // Excel-friendly separator
  lines.push('sep=;');
  lines.push(
    [
      'pedido_id',
      'fecha',
      'proveedor_ruc',
      'proveedor_razon_social',
      'proveedor_contacto',
      'proveedor_telefono',
      'proveedor_email',
      'proveedor_direccion',
      'producto_id',
      'producto_nombre',
      'cantidad'
    ].join(';')
  );

  for (const d of detRows) {
    lines.push(
      [
        csvEscape(pedido.id),
        csvEscape(pedido.fecha),
        csvEscape(pedido.numero_documento),
        csvEscape(pedido.razon_social),
        csvEscape(pedido.contacto_nombre),
        csvEscape(pedido.contacto_telefono),
        csvEscape(pedido.contacto_email),
        csvEscape(pedido.direccion),
        csvEscape(d.producto_id),
        csvEscape(d.nombre),
        csvEscape(d.cantidad)
      ].join(';')
    );
  }

  const csv = `\ufeff${lines.join('\n')}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pedido_compra_${pedido.id}.csv"`);
  res.send(csv);
};

module.exports = {
  listProveedores,
  getProveedorByRuc,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  consultarRucApi,
  listPedidosCompra,
  getPedidoCompra,
  createPedidoCompra,
  deletePedidoCompra,
  deletePedidosCompraBatch,
  downloadPedidoCsv
};
