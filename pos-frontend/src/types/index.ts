/*
 * MAPA DEL ARCHIVO: TIPOS GLOBALES FRONTEND
 * UBICACION: pos-frontend/src/types/index.ts
 * QUE HACE: Declaraciones TypeScript compartidas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// Interfaces principales para el sistema POS

export type PermissionKey =
  | 'ventas'
  | 'productos'
  | 'categorias'
  | 'proveedores'
  | 'reportes'
  | 'configuracion';

// TIPOS FRONTEND: alias UserPermissions que limita valores o forma de datos.
export type UserPermissions = Record<PermissionKey, boolean>;

export interface User {
    id?: number;
    nombreUsuario: string;
    nombreCompleto: string;
    rol: 'ADMINISTRADOR' | 'CAJERO';
    dni?: string;
    telefono?: string;
    email?: string;
    fotoUrl?: string;
    permisos?: Partial<UserPermissions> | null;
}

// TIPOS FRONTEND: estructura de datos UsuarioItem usada para tipar objetos del modulo.
export interface UsuarioItem {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  rol: 'ADMINISTRADOR' | 'CAJERO';
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  foto_url?: string | null;
  permisos?: Partial<UserPermissions> | null;
  failed_attempts?: number;
  lockouts?: number;
  lock_until?: string | null;
  is_blocked?: number | boolean;
  is_active?: number | boolean;
  created_at?: string;
}

// TIPOS FRONTEND: alias UsuarioPayload que limita valores o forma de datos.
export type UsuarioPayload = {
  nombreUsuario: string;
  nombreCompleto: string;
  rol: 'ADMINISTRADOR' | 'CAJERO';
  password?: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  fotoUrl?: string | null;
  permisos?: Partial<UserPermissions> | null;
  isActive?: boolean;
};

// TIPOS FRONTEND: estructura de datos AuthResponse usada para tipar objetos del modulo.
export interface AuthResponse {
    token: string;
    user: User;
}

// TIPOS FRONTEND: estructura de datos Producto usada para tipar objetos del modulo.
export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    precioVenta: number;
    codigoBarras?: string | null;
    fechaVencimiento?: string | null;
    stockActual: number;
    stockMinimo?: number;
    categoriaId: number;
    imagen?: string;
    activo?: boolean;
    cantidad?: number; // cantidad vendida (solo en ventas)
}

// TIPOS FRONTEND: estructura de datos LoginData usada para tipar objetos del modulo.
export interface LoginData {
    nombreUsuario: string;
    password: string;
}

// TIPOS FRONTEND: estructura de datos Categoria usada para tipar objetos del modulo.
export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

// TIPOS FRONTEND: estructura de datos Proveedor usada para tipar objetos del modulo.
export interface Proveedor {
  id: number;
  numeroDocumento: string;
  razonSocial: string;
  direccion?: string | null;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
  estado?: string | null;
  condicion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// TIPOS FRONTEND: estructura de datos PedidoCompraItem usada para tipar objetos del modulo.
export interface PedidoCompraItem {
  id?: number;
  productoId: number;
  productoNombre?: string;
  cantidad: number;
  stockActual?: number;
  stockMinimo?: number;
}

// TIPOS FRONTEND: estructura de datos PedidoCompra usada para tipar objetos del modulo.
export interface PedidoCompra {
  id: number;
  proveedorId: number;
  estado?: string;
  notas?: string | null;
  solicitanteDni?: string | null;
  solicitanteNombre?: string | null;
  comprador?: {
    nombre?: string | null;
    ruc?: string | null;
    direccion?: string | null;
    telefono?: string | null;
  };
  fecha: string;
  updatedAt?: string;
  itemsCount?: number;
  totalCantidad?: number;
  proveedor?: Pick<Proveedor, 'id' | 'numeroDocumento' | 'razonSocial' | 'contactoNombre' | 'contactoTelefono' | 'contactoEmail' | 'direccion'>;
  items?: PedidoCompraItem[];
}

// TIPOS FRONTEND: estructura de datos VentaProducto usada para tipar objetos del modulo.
export interface VentaProducto {
  producto: Producto;
  cantidad: number;
}

// TIPOS FRONTEND: alias VentaProductoInput que limita valores o forma de datos.
export type VentaProductoInput =
  | { productoId: number; cantidad: number; precioUnitario?: number }
  | { producto: Producto; cantidad: number; precioUnitario?: number };

// TIPOS FRONTEND: estructura de datos Venta usada para tipar objetos del modulo.
export interface Venta {
  id: number;
  numero?: number;
  productosVendidos: VentaProducto[];
  total: number;
  fecha: string; // ISO string
  metodoPago?: string;
  recibido?: number;
  vuelto?: number;
  clienteDni?: string | null;
  clienteNombre?: string | null;
  tipoComprobante?: 'boleta' | 'factura' | null;
  clienteTipoDocumento?: '1' | '6' | string | null;
  clienteNumeroDocumento?: string | null;
  clienteRuc?: string | null;
  clienteDireccion?: string | null;
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
  pagoReferencia?: string | null;
  pagoConfirmadoAt?: string | null;
}

// TIPOS FRONTEND: alias VentaCreatePayload que limita valores o forma de datos.
export type VentaCreatePayload = {
  productosVendidos: VentaProductoInput[];
  total: number;
  totalExtra?: number;
  metodoPago?: string;
  recibido?: number;
  vuelto?: number;
  pagoReferencia?: string | null;
  clienteDni?: string | null;
  clienteNombre?: string | null;
  tipoComprobante?: 'boleta' | 'factura' | null;
  clienteTipoDocumento?: '1' | '6' | string | null;
  clienteNumeroDocumento?: string | null;
  clienteRuc?: string | null;
  clienteDireccion?: string | null;
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
};

// TIPOS FRONTEND: pedido creado por cliente desde la ruta publica /cliente.
export interface PedidoOnline {
  id: number;
  codigo: string;
  fecha: string;
  estado: 'PENDIENTE_RECOJO' | 'PENDIENTE_PAGO' | 'PAGADO' | 'RECOGIDO' | 'ANULADO';
  metodoPago: 'RECOJO' | 'MERCADO_PAGO';
  entrega: 'RECOJO_TIENDA';
  cliente: {
    nombre: string;
    dni?: string;
    email: string;
    telefono: string;
    direccion?: string;
  };
  total: number;
  boletaHtml?: string;
  pagoReferencia?: string;
  productos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    precioVenta: number;
    subtotal: number;
  }>;
}

// TIPOS FRONTEND: payload que envia la tienda publica para registrar un pedido online.
export type PedidoOnlineCreatePayload = {
  codigo: string;
  estado: PedidoOnline['estado'];
  metodoPago: PedidoOnline['metodoPago'];
  entrega: PedidoOnline['entrega'];
  cliente: PedidoOnline['cliente'];
  total: number;
  boletaHtml?: string;
  pagoReferencia?: string;
  productos: PedidoOnline['productos'];
};

// TIPOS FRONTEND: estructura de datos DashboardStats usada para tipar objetos del modulo.
export interface DashboardStats {
  productosActivos: number;
  ventasHoy: number;
  ingresosHoy: number;
  productosBajos: number;
  productosVendidos: number;
} 
