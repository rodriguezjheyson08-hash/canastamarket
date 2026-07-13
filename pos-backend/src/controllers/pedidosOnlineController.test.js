/*
 * MAPA DEL ARCHIVO: PRUEBA BACKEND
 * UBICACION: pos-backend/src/controllers/pedidosOnlineController.test.js
 * QUE HACE: Prueba la generacion de pedidos online de clientes sin tocar MySQL real.
 * GUIA: MOCK simula pool/conexion; TEST valida pedido, stock y errores del carrito.
 */
jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../features/pedidosOnline/schema', () => ({
  ensurePedidosOnlineSchema: jest.fn()
}));
jest.mock('../features/cajas/schema', () => ({
  ensureCajasSchema: jest.fn()
}));
jest.mock('../features/inventario/service', () => ({
  registrarMovimientoInventario: jest.fn()
}));
jest.mock('../features/auditoria/service', () => ({
  registrarAuditoria: jest.fn()
}));
jest.mock('../pagos/mercadopagoService', () => ({
  getPayment: jest.fn()
}));

const pool = require('../db/pool');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');
const { registrarMovimientoInventario } = require('../features/inventario/service');
const { registrarAuditoria } = require('../features/auditoria/service');
const { getPayment } = require('../pagos/mercadopagoService');
const {
  createPedidoOnlineCliente,
  createPedidoOnlinePublic,
  updatePedidoOnlineEstado
} = require('./pedidosOnlineController');

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
};

const createConnection = () => ({
  query: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
});

const clienteRow = {
  nombre_completo: 'Ana Perez',
  dni: '12345678',
  email: 'ana@correo.com',
  telefono: '999888777',
  direccion: 'Av. Principal 123'
};

const pedidoRow = {
  id: 77,
  codigo: 'WEB-001',
  fecha: '2026-07-08 10:00:00',
  estado: 'PENDIENTE_RECOJO',
  metodo_pago: 'RECOJO',
  entrega: 'RECOJO_TIENDA',
  cliente_nombre: 'Ana Perez',
  cliente_dni: '12345678',
  cliente_email: 'ana@correo.com',
  cliente_telefono: '999888777',
  cliente_direccion: 'Av. Principal 123',
  total: '15.50',
  boleta_html: '<p>boleta</p>',
  pago_referencia: null,
  pago_recogida_metodo: null,
  pago_recogida_recibido: null,
  pago_recogida_vuelto: null,
  pago_recogida_detalle: null,
  pago_recogida_at: null
};

const detalleRows = [
  {
    pedido_id: 77,
    producto_id: 10,
    producto_nombre: 'Leche',
    cantidad: 2,
    precio_unitario: '4.50',
    subtotal: '9.00'
  },
  {
    pedido_id: 77,
    producto_id: 12,
    producto_nombre: 'Pan',
    cantidad: 1,
    precio_unitario: '6.50',
    subtotal: '6.50'
  }
];

describe('pedidosOnlineController: generar pedido online', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensurePedidosOnlineSchema.mockResolvedValue(undefined);
  });

  test('crea una compra online para un cliente autenticado, guarda detalle y descuenta stock', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    pool.query
      .mockResolvedValueOnce([[clienteRow]])
      .mockResolvedValueOnce([[pedidoRow]])
      .mockResolvedValueOnce([detalleRows]);
    connection.query.mockResolvedValueOnce([[]]);
    connection.execute
      .mockResolvedValueOnce([[{ id: 10, nombre: 'Leche', stock_actual: 8, precio_venta: '4.50' }]])
      .mockResolvedValueOnce([[{ id: 12, nombre: 'Pan', stock_actual: 5, precio_venta: '6.50' }]])
      .mockResolvedValueOnce([{ insertId: 77 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    registrarMovimientoInventario.mockResolvedValue({ stockAnterior: 8, stockNuevo: 6 });
    registrarAuditoria.mockResolvedValue(undefined);

    const req = {
      auth: { sub: 15 },
      body: {
        codigo: 'WEB-001',
        metodoPago: 'RECOJO',
        entrega: 'RECOJO_TIENDA',
        productos: [
          { id: 10, cantidad: 2 },
          { productoId: 12, cantidad: 1 }
        ],
        total: 15.5,
        boletaHtml: '<p>boleta</p>'
      }
    };
    const res = createResponse();

    await createPedidoOnlineCliente(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1'),
      [15]
    );
    expect(ensurePedidosOnlineSchema).toHaveBeenCalledWith(connection);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledWith(
      'SELECT id FROM pedidos_online WHERE codigo = ? LIMIT 1',
      ['WEB-001']
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO pedidos_online'),
      [
        'WEB-001',
        'PENDIENTE_RECOJO',
        'RECOJO',
        'RECOJO_TIENDA',
        'Ana Perez',
        '12345678',
        'ana@correo.com',
        '999888777',
        'Av. Principal 123',
        15.5,
        '<p>boleta</p>',
        null
      ]
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO pedidos_online_detalles'),
      [77, 10, 'Leche', 2, 4.5, 9]
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('INSERT INTO pedidos_online_detalles'),
      [77, 12, 'Pan', 1, 6.5, 6.5]
    );
    expect(registrarMovimientoInventario).toHaveBeenCalledTimes(2);
    expect(registrarMovimientoInventario).toHaveBeenNthCalledWith(1, connection, expect.objectContaining({
      productoId: 10,
      tipo: 'PEDIDO_ONLINE',
      cantidad: 2,
      direccion: 'SALIDA',
      referenciaId: 77
    }));
    expect(registrarMovimientoInventario).toHaveBeenNthCalledWith(2, connection, expect.objectContaining({
      productoId: 12,
      cantidad: 1
    }));
    expect(registrarAuditoria).toHaveBeenCalledWith(connection, expect.objectContaining({
      accion: 'PEDIDO_ONLINE_CREADO',
      entidad: 'pedido_online',
      entidadId: 77
    }));
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 77,
      codigo: 'WEB-001',
      fecha: '2026-07-08 10:00:00',
      estado: 'PENDIENTE_RECOJO',
      metodoPago: 'RECOJO',
      entrega: 'RECOJO_TIENDA',
      cliente: {
        nombre: 'Ana Perez',
        dni: '12345678',
        email: 'ana@correo.com',
        telefono: '999888777',
        direccion: 'Av. Principal 123'
      },
      total: 15.5,
      boletaHtml: '<p>boleta</p>',
      pagoReferencia: '',
      pagoRecogidaMetodo: '',
      pagoRecogidaRecibido: null,
      pagoRecogidaVuelto: null,
      pagoRecogidaDetalle: null,
      pagoRecogidaAt: '',
      canceladoPor: '',
      canceladoAt: '',
      cancelacionMotivo: '',
      reembolsoEstado: '',
      productos: [
        { id: 10, nombre: 'Leche', cantidad: 2, precioVenta: 4.5, subtotal: 9 },
        { id: 12, nombre: 'Pan', cantidad: 1, precioVenta: 6.5, subtotal: 6.5 }
      ]
    });
  });

  test('rechaza crear pedido si el cliente autenticado no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const req = { auth: { sub: 99 }, body: { productos: [{ id: 10, cantidad: 1 }], total: 4.5 } };
    const res = createResponse();

    await createPedidoOnlineCliente(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado.' });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('rechaza carritos sin productos antes de abrir transaccion', async () => {
    const req = {
      body: {
        cliente: { nombre: 'Ana Perez', dni: '12345678', email: 'ana@correo.com', telefono: '999888777' },
        productos: [],
        total: 10
      }
    };
    const res = createResponse();

    await createPedidoOnlinePublic(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Debe enviar productos para el pedido.' });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('revierte la transaccion si el total enviado no coincide con precios de MySQL', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query.mockResolvedValueOnce([[]]);
    connection.execute.mockResolvedValueOnce([
      [{ id: 10, nombre: 'Leche', stock_actual: 8, precio_venta: '4.50' }]
    ]);
    const req = {
      body: {
        codigo: 'WEB-TOTAL-MALO',
        cliente: { nombre: 'Ana Perez', dni: '12345678', email: 'ana@correo.com', telefono: '999888777' },
        productos: [{ id: 10, cantidad: 2 }],
        total: 20
      }
    };
    const res = createResponse();

    await createPedidoOnlinePublic(req, res);

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Total inválido. Revisa el carrito.' });
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('rechaza registrar Mercado Pago si el pago aun no esta aprobado', async () => {
    const req = {
      body: {
        codigo: 'WEB-MP-PENDIENTE',
        estado: 'PENDIENTE_PAGO',
        metodoPago: 'MERCADO_PAGO',
        pagoReferencia: '123',
        cliente: { nombre: 'Ana Perez', dni: '12345678', email: 'ana@correo.com', telefono: '999888777' },
        productos: [{ id: 10, cantidad: 1 }],
        total: 4.5
      }
    };
    const res = createResponse();

    await createPedidoOnlinePublic(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'El pedido con Mercado Pago solo se registra cuando el pago esta aprobado.' });
    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(getPayment).not.toHaveBeenCalled();
  });

  test('revierte si Mercado Pago no confirma el cobro real', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query.mockResolvedValueOnce([[]]);
    connection.execute.mockResolvedValueOnce([
      [{ id: 10, nombre: 'Leche', stock_actual: 8, precio_venta: '4.50' }]
    ]);
    getPayment.mockResolvedValueOnce({ status: 'pending', transaction_amount: 4.5 });
    const req = {
      body: {
        codigo: 'WEB-MP-FALSO',
        estado: 'PAGADO',
        metodoPago: 'MERCADO_PAGO',
        pagoReferencia: '123',
        cliente: { nombre: 'Ana Perez', dni: '12345678', email: 'ana@correo.com', telefono: '999888777' },
        productos: [{ id: 10, cantidad: 1 }],
        total: 4.5
      }
    };
    const res = createResponse();

    await createPedidoOnlinePublic(req, res);

    expect(getPayment).toHaveBeenCalledWith('123');
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Mercado Pago no confirmo el pago. Estado actual: pending.' });
  });

  test('devuelve el pedido existente cuando el codigo ya fue registrado', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query.mockResolvedValueOnce([[{ id: 77 }]]);
    pool.query
      .mockResolvedValueOnce([[pedidoRow]])
      .mockResolvedValueOnce([detalleRows]);
    const req = {
      body: {
        codigo: 'WEB-001',
        cliente: { nombre: 'Ana Perez', dni: '12345678', email: 'ana@correo.com', telefono: '999888777' },
        productos: [{ id: 10, cantidad: 2 }],
        total: 9
      }
    };
    const res = createResponse();

    await createPedidoOnlinePublic(req, res);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 77, codigo: 'WEB-001' }));
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('prepara el pedido online marcandolo como recogido y devuelve el pedido actualizado', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{
        id: 77,
        estado: 'PENDIENTE_RECOJO',
        metodo_pago: 'RECOJO',
        total: '15.50',
        boleta_html: '<p><strong>Pago:</strong> Al recoger</p>'
      }]])
      .mockResolvedValueOnce([[{ id: 44 }]]);
    connection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    pool.query
      .mockResolvedValueOnce([[{ ...pedidoRow, estado: 'RECOGIDO' }]])
      .mockResolvedValueOnce([detalleRows]);
    registrarAuditoria.mockResolvedValue(undefined);

    const req = {
      params: { id: '77' },
      body: {
        estado: 'RECOGIDO',
        motivo: 'Pedido preparado y entregado',
        pagoRecogidaMetodo: 'efectivo',
        pagoRecogidaRecibido: 20
      },
      auth: { sub: 3, type: 'admin' }
    };
    const res = createResponse();

    await updatePedidoOnlineEstado(req, res);

    expect(ensurePedidosOnlineSchema).toHaveBeenCalledWith();
    expect(ensurePedidosOnlineSchema).toHaveBeenCalledWith(connection);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledWith(
      'SELECT id, estado, metodo_pago, total, boleta_html FROM pedidos_online WHERE id = ? FOR UPDATE',
      [77]
    );
    expect(connection.execute.mock.calls[0][0]).toContain('pago_recogida_metodo');
    expect(connection.execute.mock.calls[0][1]).toEqual([
      'RECOGIDO',
      'efectivo',
      20,
      4.5,
      null,
      44,
      '<p><strong>Pago:</strong> Efectivo</p>',
      77
    ]);
    expect(registrarMovimientoInventario).not.toHaveBeenCalled();
    expect(registrarAuditoria).toHaveBeenCalledWith(connection, expect.objectContaining({
      accion: 'PEDIDO_ONLINE_CAMBIO_ESTADO',
      entidad: 'pedido_online',
      entidadId: 77,
      detalle: {
        estadoAnterior: 'PENDIENTE_RECOJO',
        estadoNuevo: 'RECOGIDO',
        motivo: 'Pedido preparado y entregado',
        pagoRecogidaMetodo: 'efectivo'
      }
    }));
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM pedidos_online'),
      [77]
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM pedidos_online_detalles'),
      [77]
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 77,
      codigo: 'WEB-001',
      estado: 'RECOGIDO'
    }));
  });

  test('rechaza marcar recogido si el pedido al recoger no trae metodo de pago', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{
        id: 77,
        estado: 'PENDIENTE_RECOJO',
        metodo_pago: 'RECOJO',
        total: '15.50',
        boleta_html: '<p><strong>Pago:</strong> Al recoger</p>'
      }]])
      .mockResolvedValueOnce([[{ id: 44 }]]);

    const req = {
      params: { id: '77' },
      body: { estado: 'RECOGIDO' },
      auth: { sub: 3, type: 'admin' }
    };
    const res = createResponse();

    await updatePedidoOnlineEstado(req, res);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Indica como pago el cliente al recoger.' });
  });

  test('anula el pedido online y registra entrada de inventario por cada producto', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query
      .mockResolvedValueOnce([[{ id: 77, estado: 'PENDIENTE_RECOJO' }]])
      .mockResolvedValueOnce([[{ producto_id: 10, cantidad: 2 }, { producto_id: 12, cantidad: 1 }]]);
    connection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    pool.query
      .mockResolvedValueOnce([[{ ...pedidoRow, estado: 'ANULADO' }]])
      .mockResolvedValueOnce([detalleRows]);
    registrarMovimientoInventario.mockResolvedValue(undefined);
    registrarAuditoria.mockResolvedValue(undefined);

    const req = {
      params: { id: '77' },
      body: { estado: 'ANULADO', motivo: 'Cliente cancelo el pedido' },
      auth: { sub: 3, type: 'admin' }
    };
    const res = createResponse();

    await updatePedidoOnlineEstado(req, res);

    expect(connection.query).toHaveBeenNthCalledWith(
      2,
      'SELECT producto_id, cantidad FROM pedidos_online_detalles WHERE pedido_id = ?',
      [77]
    );
    expect(registrarMovimientoInventario).toHaveBeenCalledTimes(2);
    expect(registrarMovimientoInventario).toHaveBeenNthCalledWith(1, connection, expect.objectContaining({
      productoId: 10,
      tipo: 'ANULACION_PEDIDO_ONLINE',
      cantidad: 2,
      direccion: 'ENTRADA',
      referenciaId: 77,
      motivo: 'Cliente cancelo el pedido'
    }));
    expect(registrarMovimientoInventario).toHaveBeenNthCalledWith(2, connection, expect.objectContaining({
      productoId: 12,
      cantidad: 1,
      direccion: 'ENTRADA'
    }));
    expect(connection.execute.mock.calls.some((call) => (
      call[0].includes("SET estado = 'ANULADO'") &&
      call[1][0] === 'ADMIN' &&
      call[1][1] === 'Cliente cancelo el pedido' &&
      call[1][3] === 77
    ))).toBe(true);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 77,
      estado: 'ANULADO'
    }));
  });

  test('rechaza preparar pedido con estado invalido sin abrir conexion', async () => {
    const req = { params: { id: '77' }, body: { estado: 'PREPARANDO' } };
    const res = createResponse();

    await updatePedidoOnlineEstado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Estado inválido.' });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('no permite reactivar un pedido online anulado', async () => {
    const connection = createConnection();
    pool.getConnection.mockResolvedValue(connection);
    connection.query.mockResolvedValueOnce([[{ id: 77, estado: 'ANULADO' }]]);
    const req = { params: { id: '77' }, body: { estado: 'RECOGIDO' } };
    const res = createResponse();

    await updatePedidoOnlineEstado(req, res);

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
    expect(registrarMovimientoInventario).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No se puede reactivar un pedido anulado.' });
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
