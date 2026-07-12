/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/proveedoresController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');
const { consultarRuc } = require('../apidni/rucService');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { ensureProveedoresSchema } = require('../utils/ensureProveedoresSchema');
const {
  csvEscape,
  mapPedidoCompraRow,
  normalizeProveedorRow,
  normalizeRucApiData,
  proveedorSelect
} = require('../features/proveedores/mappers');
const { isRucValido, toDbProveedor } = require('../features/proveedores/validators');
const { registrarAuditoria } = require('../features/auditoria/service');
const { registrarMovimientoInventario } = require('../features/inventario/service');

// LOGICA BACKEND: obtiene un proveedor por ID y lo normaliza para responder al frontend.
const getProveedorRowById = async (id) => {
  const [rows] = await pool.query(`SELECT ${proveedorSelect} FROM proveedores WHERE id = ?`, [id]);
  return rows[0] ? normalizeProveedorRow(rows[0]) : null;
};

// LOGICA PDF/PEDIDO - TEXTO:
// Limpia textos libres antes de guardarlos o imprimirlos en la orden de compra.
const cleanText = (value, maxLength = 255) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
};

// LOGICA PDF/PEDIDO - NUMEROS:
// Conserva solo digitos para DNI/RUC y evita longitudes fuera del formato peruano.
const cleanDigits = (value, maxLength) => {
  const text = String(value ?? '').replace(/\D/g, '');
  return text ? text.slice(0, maxLength) : null;
};

// LOGICA PDF - COMPRADOR:
// Datos por defecto del minimarket si el frontend no envia configuracion de boleta.
const getDefaultComprador = () => ({
  nombre: 'MINI MARKET',
  ruc: '20599988877',
  direccion: 'Av. America Sur',
  telefono: '975929943'
});

// LOGICA PDF - FECHA:
// Formatea la fecha de la orden en zona horaria de Peru.
const formatPedidoFecha = (fecha) => {
  const date = fecha ? new Date(fecha) : new Date();
  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// LOGICA PDF - LOGO:
// Busca el logo configurado o el logo local del frontend para la cabecera del PDF.
const findLogoPath = () => {
  const configured = cleanText(process.env.ORDEN_COMPRA_LOGO_PATH, 500);
  const candidates = [
    configured,
    path.resolve(__dirname, '../../../pos-frontend/public/images/Logo Market.png')
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

// LOGICA PDF - ROTULOS:
// Dibuja pares etiqueta/valor usados en proveedor, comprador y solicitante.
const drawKeyValue = (doc, label, value, x, y, options = {}) => {
  const labelWidth = options.labelWidth || 90;
  const valueWidth = options.valueWidth || 280;
  doc.font('Helvetica-Bold').text(label, x, y, { width: labelWidth });
  doc.font('Helvetica').text(value || '-', x + labelWidth, y, { width: valueWidth });
  return Math.max(
    doc.heightOfString(label, { width: labelWidth }),
    doc.heightOfString(value || '-', { width: valueWidth })
  );
};

// LOGICA PDF - DATOS:
// Carga cabecera, proveedor e items necesarios para generar la orden de compra.
const loadPedidoCompraPdfData = async (pedidoId) => {
  const [pedidoRows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            pc.solicitante_dni, pc.solicitante_nombre,
            pc.comprador_nombre, pc.comprador_ruc, pc.comprador_direccion, pc.comprador_telefono,
            p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      WHERE pc.id = ? LIMIT 1`,
    [pedidoId]
  );
  if (pedidoRows.length === 0) return null;

  const [items] = await pool.query(
    `SELECT d.producto_id, d.cantidad, pr.nombre, pr.descripcion
       FROM pedidos_compra_detalles d
       JOIN productos pr ON pr.id = d.producto_id
      WHERE d.pedido_compra_id = ?
      ORDER BY pr.nombre`,
    [pedidoId]
  );

  return { pedido: pedidoRows[0], items };
};

// LOGICA BACKEND: lista proveedores activos para la tabla del frontend.
const listProveedores = async (_req, res) => {
  await ensureProveedoresSchema();
  const [rows] = await pool.query(
    `SELECT ${proveedorSelect}
       FROM proveedores
      WHERE activo = 1
      ORDER BY razon_social`
  );
  res.json(rows.map(normalizeProveedorRow));
};

// LOGICA BACKEND: busca un proveedor por RUC dentro de la base de datos local.
const getProveedorByRuc = async (req, res) => {
  await ensureProveedoresSchema();
  const ruc = req.params.ruc || req.query.ruc;
  if (!isRucValido(ruc)) return res.status(400).json({ message: 'El RUC debe tener 11 dígitos.' });

  const [rows] = await pool.query(
    `SELECT ${proveedorSelect} FROM proveedores WHERE numero_documento = ? LIMIT 1`,
    [String(ruc).trim()]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Proveedor no encontrado.' });
  res.json(normalizeProveedorRow(rows[0]));
};

// LOGICA BACKEND: crea proveedor nuevo usando los datos enviados por el formulario.
const createProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const data = toDbProveedor(req.body);
  if (!isRucValido(data.numero_documento)) return res.status(400).json({ message: 'numeroDocumento (RUC) debe tener 11 dígitos.' });
  if (!data.razon_social) return res.status(400).json({ message: 'razonSocial es obligatorio.' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO proveedores
        (numero_documento, razon_social, direccion, contacto_nombre, contacto_telefono, contacto_email,
         estado, condicion, distrito, provincia, departamento, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        data.numero_documento, data.razon_social, data.direccion, data.contacto_nombre, data.contacto_telefono,
        data.contacto_email, data.estado, data.condicion, data.distrito, data.provincia, data.departamento
      ]
    );
    res.status(201).json(await getProveedorRowById(result.insertId));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un proveedor con ese RUC.' });
    throw error;
  }
};

// LOGICA BACKEND: actualiza proveedor existente desde el formulario de editar.
const updateProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const { id } = req.params;
  const data = toDbProveedor(req.body);
  if (data.numero_documento !== undefined && !isRucValido(data.numero_documento)) {
    return res.status(400).json({ message: 'numeroDocumento (RUC) debe tener 11 dígitos.' });
  }
  if (data.razon_social !== undefined && !data.razon_social) {
    return res.status(400).json({ message: 'razonSocial no puede estar vacío.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE proveedores SET
        numero_documento = COALESCE(?, numero_documento),
        razon_social = COALESCE(?, razon_social),
        direccion = ?, contacto_nombre = ?, contacto_telefono = ?, contacto_email = ?,
        estado = ?, condicion = ?, distrito = ?, provincia = ?, departamento = ?,
        activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        data.numero_documento, data.razon_social, data.direccion, data.contacto_nombre, data.contacto_telefono,
        data.contacto_email, data.estado, data.condicion, data.distrito, data.provincia, data.departamento,
        req.body?.activo === undefined ? null : (req.body.activo ? 1 : 0),
        id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Proveedor no encontrado.' });
    res.json(await getProveedorRowById(id));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un proveedor con ese RUC.' });
    throw error;
  }
};

// LOGICA BACKEND: baja logica; no borra la fila, solo marca activo = 0.
const deleteProveedor = async (req, res) => {
  await ensureProveedoresSchema();
  const [pedidos] = await pool.query(
    'SELECT COUNT(*) AS total FROM pedidos_compra WHERE proveedor_id = ?',
    [req.params.id]
  );
  if (Number(pedidos[0]?.total || 0) > 0) {
    return res.status(409).json({
      message: 'No se puede eliminar el proveedor porque tiene pedidos de compra registrados.'
    });
  }
  const [result] = await pool.execute('UPDATE proveedores SET activo = 0 WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Proveedor no encontrado.' });
  res.status(204).send();
};

// LOGICA BACKEND: consulta RUC en servicio externo y devuelve datos normalizados.
const consultarRucApi = async (req, res) => {
  const ruc = req.params.ruc || req.query.ruc;
  if (!isRucValido(ruc)) return res.status(400).json({ message: 'El RUC debe tener 11 dígitos.' });

  try {
    const data = await consultarRuc(String(ruc).trim());
    res.json(normalizeRucApiData(ruc, data));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        message: error.response?.data?.message || 'No se pudo consultar RUC.',
        details: error.response?.data
      });
    }
    res.status(error.status || 500).json({ message: error.message || 'No se pudo consultar RUC.' });
  }
};

// LOGICA BACKEND: lista pedidos de compra mostrados en la pestana "Pedidos de compra".
const listPedidosCompra = async (_req, res) => {
  await ensureProveedoresSchema();
  const [rows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            pc.solicitante_dni, pc.solicitante_nombre,
            pc.comprador_nombre, pc.comprador_ruc, pc.comprador_direccion, pc.comprador_telefono,
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

// LOGICA BACKEND: obtiene un pedido de compra con su proveedor e items.
const getPedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const [rows] = await pool.query(
    `SELECT pc.id, pc.proveedor_id, pc.estado, pc.notas, pc.fecha, pc.updated_at,
            pc.solicitante_dni, pc.solicitante_nombre,
            pc.comprador_nombre, pc.comprador_ruc, pc.comprador_direccion, pc.comprador_telefono,
            p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      WHERE pc.id = ? LIMIT 1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });

  const pedido = mapPedidoCompraRow(rows[0]);
  const [items] = await pool.query(
    `SELECT d.id, d.producto_id, d.cantidad, pr.nombre, pr.stock_actual, pr.stock_minimo,
            pr.fecha_vencimiento, pr.precio_compra
       FROM pedidos_compra_detalles d
       JOIN productos pr ON pr.id = d.producto_id
      WHERE d.pedido_compra_id = ?
      ORDER BY pr.nombre`,
    [req.params.id]
  );
  pedido.items = items.map((row) => ({
    id: row.id,
    productoId: row.producto_id,
    productoNombre: row.nombre,
    cantidad: Number(row.cantidad),
    stockActual: Number(row.stock_actual),
    stockMinimo: Number(row.stock_minimo),
    fechaVencimiento: row.fecha_vencimiento instanceof Date ? row.fecha_vencimiento.toISOString().slice(0, 10) : row.fecha_vencimiento,
    precioCompra: row.precio_compra === null ? null : Number(row.precio_compra)
  }));
  res.json(pedido);
};

// LOGICA BACKEND: crea pedido de compra con transaccion para guardar cabecera e items juntos.
const createPedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const proveedorId = Number(req.body?.proveedorId);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const compradorDefaults = getDefaultComprador();
  const solicitanteDni = cleanDigits(req.body?.solicitanteDni, 8);
  const solicitanteNombre = cleanText(req.body?.solicitanteNombre, 160);
  const comprador = {
    nombre: cleanText(req.body?.comprador?.nombre, 160) || compradorDefaults.nombre,
    ruc: cleanDigits(req.body?.comprador?.ruc, 11) || compradorDefaults.ruc,
    direccion: cleanText(req.body?.comprador?.direccion, 255) || compradorDefaults.direccion,
    telefono: cleanText(req.body?.comprador?.telefono, 40) || compradorDefaults.telefono
  };
  const normalizedItems = items
    .map((item) => ({ productoId: Number(item?.productoId), cantidad: Number(item?.cantidad) }))
    .filter((item) => Number.isInteger(item.productoId) && item.productoId > 0 && Number.isFinite(item.cantidad) && item.cantidad > 0);

  if (!Number.isInteger(proveedorId) || proveedorId <= 0) return res.status(400).json({ message: 'proveedorId es obligatorio.' });
  if (normalizedItems.length === 0) return res.status(400).json({ message: 'items es obligatorio.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [proveedores] = await conn.query('SELECT id FROM proveedores WHERE id = ? AND activo = 1 LIMIT 1', [proveedorId]);
    if (proveedores.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    const [result] = await conn.execute(
      `INSERT INTO pedidos_compra
        (proveedor_id, estado, notas, solicitante_dni, solicitante_nombre,
         comprador_nombre, comprador_ruc, comprador_direccion, comprador_telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proveedorId,
        'BORRADOR',
        cleanText(req.body?.notas, 255),
        solicitanteDni,
        solicitanteNombre,
        comprador.nombre,
        comprador.ruc,
        comprador.direccion,
        comprador.telefono
      ]
    );
    for (const item of normalizedItems) {
      await conn.execute(
        'INSERT INTO pedidos_compra_detalles (pedido_compra_id, producto_id, cantidad) VALUES (?, ?, ?)',
        [result.insertId, item.productoId, item.cantidad]
      );
    }
    await conn.commit();
    req.params.id = String(result.insertId);
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

// LOGICA BACKEND: elimina un pedido de compra por ID.
const deletePedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const [result] = await pool.execute('DELETE FROM pedidos_compra WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });
  res.status(204).send();
};

const recibirPedidoCompra = async (req, res) => {
  await ensureProveedoresSchema();
  const pedidoId = Number(req.params.id);
  const motivo = cleanText(req.body?.motivo, 255) || `Recepcion de orden de compra #${pedidoId}`;
  const lotesInput = Array.isArray(req.body?.items) ? req.body.items : [];
  const lotesPorProducto = new Map(
    lotesInput
      .map((item) => [Number(item.productoId), item])
      .filter(([productoId]) => Number.isInteger(productoId) && productoId > 0)
  );

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'Pedido de compra invalido.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pedidos] = await conn.query(
      'SELECT id, estado, proveedor_id FROM pedidos_compra WHERE id = ? FOR UPDATE',
      [pedidoId]
    );
    if (pedidos.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Pedido de compra no encontrado.' });
    }
    if (pedidos[0].estado === 'RECIBIDO') {
      await conn.rollback();
      return res.status(400).json({ message: 'El pedido de compra ya fue recibido.' });
    }

    const [items] = await conn.query(
      `SELECT d.producto_id, d.cantidad, p.fecha_vencimiento, p.precio_compra
         FROM pedidos_compra_detalles d
         JOIN productos p ON p.id = d.producto_id
        WHERE d.pedido_compra_id = ?`,
      [pedidoId]
    );
    if (items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'El pedido no tiene items para recibir.' });
    }

    for (const item of items) {
      const loteInput = lotesPorProducto.get(Number(item.producto_id)) || {};
      const cantidadRecibida = Number(loteInput.cantidadRecibida || item.cantidad);
      await registrarMovimientoInventario(conn, {
        req,
        productoId: item.producto_id,
        tipo: 'COMPRA_RECIBIDA',
        cantidad: cantidadRecibida,
        direccion: 'ENTRADA',
        referenciaTipo: 'PEDIDO_COMPRA',
        referenciaId: pedidoId,
        motivo,
        fechaVencimiento: loteInput.fechaVencimiento || item.fecha_vencimiento,
        costoUnitario: loteInput.costoUnitario ?? item.precio_compra,
        proveedorId: pedidos[0].proveedor_id,
        pedidoCompraId: pedidoId,
        codigoLote: loteInput.codigoLote || `OC-${pedidoId}-P${item.producto_id}`
      });
    }

    await conn.execute(
      "UPDATE pedidos_compra SET estado = 'RECIBIDO', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [pedidoId]
    );
    await registrarAuditoria(conn, {
      req,
      accion: 'PEDIDO_COMPRA_RECIBIDO',
      entidad: 'pedido_compra',
      entidadId: pedidoId,
      detalle: { motivo, items: items.length }
    });

    await conn.commit();
    req.params.id = String(pedidoId);
    return getPedidoCompra(req, res);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    return res.status(400).json({ message: error.message || 'No se pudo recibir el pedido de compra.' });
  } finally {
    conn.release();
  }
};

// LOGICA BACKEND: elimina varios pedidos seleccionados desde la tabla.
const deletePedidosCompraBatch = async (req, res) => {
  await ensureProveedoresSchema();
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return res.status(400).json({ message: 'Debes enviar IDs válidos.' });
  const [result] = await pool.query('DELETE FROM pedidos_compra WHERE id IN (?)', [ids]);
  res.json({ deleted: Number(result.affectedRows || 0), ids });
};

// LOGICA BACKEND: genera CSV para descargar/enviar el pedido al proveedor.
const downloadPedidoCsv = async (req, res) => {
  await ensureProveedoresSchema();
  const [pedidoRows] = await pool.query(
    `SELECT pc.id, pc.fecha, p.numero_documento, p.razon_social, p.contacto_nombre, p.contacto_telefono, p.contacto_email, p.direccion
       FROM pedidos_compra pc
       JOIN proveedores p ON p.id = pc.proveedor_id
      WHERE pc.id = ? LIMIT 1`,
    [req.params.id]
  );
  if (pedidoRows.length === 0) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });

  const [items] = await pool.query(
    `SELECT d.producto_id, d.cantidad, pr.nombre
       FROM pedidos_compra_detalles d
       JOIN productos pr ON pr.id = d.producto_id
      WHERE d.pedido_compra_id = ?
      ORDER BY pr.nombre`,
    [req.params.id]
  );

  const pedido = pedidoRows[0];
  const lines = [
    'sep=;',
    'pedido_id;fecha;proveedor_ruc;proveedor_razon_social;proveedor_contacto;proveedor_telefono;proveedor_email;proveedor_direccion;producto_id;producto_nombre;cantidad'
  ];
  items.forEach((item) => {
    lines.push([
      pedido.id,
      pedido.fecha,
      pedido.numero_documento,
      pedido.razon_social,
      pedido.contacto_nombre,
      pedido.contacto_telefono,
      pedido.contacto_email,
      pedido.direccion,
      item.producto_id,
      item.nombre,
      item.cantidad
    ].map(csvEscape).join(';'));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pedido_compra_${pedido.id}.csv"`);
  res.send(`\ufeff${lines.join('\n')}`);
};

// LOGICA BACKEND: genera PDF formal de orden de compra para proveedores.
const downloadPedidoPdf = async (req, res) => {
  await ensureProveedoresSchema();
  const data = await loadPedidoCompraPdfData(req.params.id);
  if (!data) return res.status(404).json({ message: 'Pedido de compra no encontrado.' });

  const { pedido, items } = data;
  const compradorDefaults = getDefaultComprador();
  const comprador = {
    nombre: pedido.comprador_nombre || compradorDefaults.nombre,
    ruc: pedido.comprador_ruc || compradorDefaults.ruc,
    direccion: pedido.comprador_direccion || compradorDefaults.direccion,
    telefono: pedido.comprador_telefono || compradorDefaults.telefono
  };

  const doc = new PDFDocument({ size: 'A4', margin: 36, info: { Title: `Orden de compra ${pedido.id}` } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="orden_compra_${pedido.id}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 72;
  const logoX = 40;
  const logoY = 38;
  const logoSize = 62;
  const logoPath = findLogoPath();

  doc.rect(logoX, logoY, logoSize, logoSize).stroke('#c8c8c8');
  if (logoPath) {
    try {
      doc.image(logoPath, logoX + 4, logoY + 4, { fit: [logoSize - 8, logoSize - 8], align: 'center', valign: 'center' });
    } catch {
      doc.fontSize(8).fillColor('#777').text('LOGO', logoX, logoY + 25, { width: logoSize, align: 'center' });
    }
  } else {
    doc.fontSize(8).fillColor('#777').text('LOGO', logoX, logoY + 25, { width: logoSize, align: 'center' });
  }

  doc.fillColor('#111').font('Helvetica-Bold').fontSize(15).text(comprador.nombre, 116, 42, { width: 235 });
  doc.font('Helvetica').fontSize(9);
  doc.text(`RUC: ${comprador.ruc || '-'}`, 116, 62);
  doc.text(`Tel: ${comprador.telefono || '-'}`, 116, 76);
  doc.text(`Dir: ${comprador.direccion || '-'}`, 116, 90, { width: 250 });

  doc.font('Helvetica-Bold').fontSize(15).text('ORDEN DE COMPRA', 380, 42, { width: 160, align: 'right' });
  doc.font('Helvetica').fontSize(10).text(`N° ${pedido.id}`, 380, 62, { width: 160, align: 'right' });
  doc.text(`Fecha: ${formatPedidoFecha(pedido.fecha)}`, 330, 80, { width: 210, align: 'right' });
  doc.moveTo(36, 118).lineTo(pageWidth - 36, 118).stroke('#1e88e5');

  let y = 132;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text('Proveedor', 36, y);
  y += 18;
  doc.fontSize(9);
  [
    ['Razon social:', pedido.razon_social],
    ['RUC:', pedido.numero_documento],
    ['Direccion:', pedido.direccion],
    ['Contacto:', pedido.contacto_nombre],
    ['Telefono:', pedido.contacto_telefono],
    ['Email:', pedido.contacto_email]
  ].forEach(([label, value]) => {
    const height = drawKeyValue(doc, label, value, 36, y, { labelWidth: 88, valueWidth: 380 });
    y += Math.max(16, height + 4);
  });

  y += 8;
  doc.font('Helvetica-Bold').fontSize(11).text('Condiciones / observaciones', 36, y);
  y += 16;
  drawKeyValue(doc, 'Notas:', pedido.notas || 'Pedido generado desde gestion de productos', 36, y, { labelWidth: 88, valueWidth: 420 });
  y += Math.max(22, doc.heightOfString(pedido.notas || 'Pedido generado desde gestion de productos', { width: 420 }) + 10);

  y += 10;
  doc.rect(36, y, contentWidth, 22).fill('#1976d2');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  doc.text('N°', 44, y + 7, { width: 24 });
  doc.text('Producto', 72, y + 7, { width: 360 });
  doc.text('Cantidad', 482, y + 7, { width: 58, align: 'right' });
  y += 22;

  doc.fillColor('#111').font('Helvetica').fontSize(8);
  items.forEach((item, index) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    const rowHeight = 22;
    doc.rect(36, y, contentWidth, rowHeight).stroke('#eeeeee');
    doc.text(String(index + 1), 44, y + 7, { width: 24 });
    doc.font('Helvetica').text(item.nombre || '-', 72, y + 7, { width: 360 });
    doc.text(String(item.cantidad), 482, y + 7, { width: 58, align: 'right' });
    y += rowHeight;
  });

  const totalCantidad = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  y += 10;
  doc.font('Helvetica-Bold').fontSize(9).text(`Total items: ${items.length} | Total cantidad: ${totalCantidad}`, 36, y);

  y += 30;
  doc.font('Helvetica-Bold').fontSize(10).text('Solicitante', 36, y);
  y += 16;
  drawKeyValue(doc, 'Nombre:', pedido.solicitante_nombre, 36, y, { labelWidth: 70, valueWidth: 260 });
  drawKeyValue(doc, 'DNI:', pedido.solicitante_dni, 36, y + 16, { labelWidth: 70, valueWidth: 180 });
  doc.moveTo(350, y + 34).lineTo(530, y + 34).stroke('#777');
  doc.font('Helvetica').fontSize(8).text('Firma / conformidad', 350, y + 39, { width: 180, align: 'center' });

  doc.fontSize(7).fillColor('#777').text(
    'Documento interno de solicitud de compra. La factura o comprobante emitido por el proveedor debe consignar los datos tributarios correspondientes.',
    36,
    790,
    { width: contentWidth, align: 'center' }
  );

  doc.end();
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
  recibirPedidoCompra,
  deletePedidoCompra,
  deletePedidosCompraBatch,
  downloadPedidoCsv,
  downloadPedidoPdf
};
