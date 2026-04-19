// Interfaces principales para el sistema POS

export type PermissionKey =
  | 'ventas'
  | 'pedidos'
  | 'reparto'
  | 'mesas'
  | 'productos'
  | 'proveedores'
  | 'categorias'
  | 'reportes'
  | 'detalleCajero'
  | 'configuracion';

export type UserPermissions = Record<PermissionKey, boolean>;

export interface User {
    id?: number;
    nombreUsuario: string;
    nombreCompleto: string;
    rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
    dni?: string;
    telefono?: string;
    email?: string;
    fotoUrl?: string;
    permisos?: Partial<UserPermissions> | null;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    precioVenta: number;
    stockActual: number;
    categoriaId: number;
    imagen?: string;
    activo?: boolean;
    cantidad?: number; // cantidad vendida (solo en ventas)
}

export interface Proveedor {
  id: number;
  numeroDocumento: string; // RUC
  razonSocial: string;
  estado?: string | null;
  condicion?: string | null;
  direccion?: string | null;
  ubigeo?: string | null;
  viaTipo?: string | null;
  viaNombre?: string | null;
  zonaCodigo?: string | null;
  zonaTipo?: string | null;
  numero?: string | null;
  interior?: string | null;
  lote?: string | null;
  dpto?: string | null;
  manzana?: string | null;
  kilometro?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  tipo?: string | null;
  actividadEconomica?: string | null;
  numeroTrabajadores?: number | null;
  tipoFacturacion?: string | null;
  tipoContabilidad?: string | null;
  comercioExterior?: string | null;
  esAgenteRetencion?: boolean | null;
  esBuenContribuyente?: boolean | null;
  localesAnexos?: any;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PedidoCompraItem {
  productoId: number;
  productoNombre?: string;
  cantidad: number;
  stockActual?: number;
  stockMinimo?: number;
}

export interface PedidoCompra {
  id: number;
  proveedorId: number;
  estado: string;
  notas?: string | null;
  fecha: string;
  updatedAt?: string;
  itemsCount?: number;
  totalCantidad?: number;
  proveedor: Pick<Proveedor, 'id' | 'numeroDocumento' | 'razonSocial' | 'contactoNombre' | 'contactoTelefono' | 'contactoEmail' | 'direccion'>;
  items?: PedidoCompraItem[];
}

export interface LoginData {
    nombreUsuario: string;
    password: string;
}

export interface RegisterData extends LoginData {
    confirmPassword: string;
    nombreCompleto: string;
    rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
}

export interface Cliente {
  id: number;
  email: string;
  nombreCompleto?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  provider?: 'email' | 'google' | string;
  isActive?: boolean;
  createdAt?: string;
}

export interface ClienteLoginData {
  email: string;
  password: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface VentaProducto {
  producto: Producto;
  cantidad: number;
}

export type VentaProductoInput =
  | { productoId: number; cantidad: number; precioUnitario?: number }
  | { producto: Producto; cantidad: number; precioUnitario?: number };

export interface Venta {
  id: number;
  numero?: number;
  productosVendidos: VentaProducto[];
  total: number;
  fecha: string; // ISO string
  metodoPago?: string;
  recibido?: number;
  vuelto?: number;
  clienteId?: number | null;
  clienteDni?: string | null;
  clienteNombre?: string | null;
  pedidoEstado?: string | null;
  pedidoUpdatedAt?: string | null;
  direccionEntrega?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  pedidoRechazoMotivo?: string | null;
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
  repartidorId?: number | null;
  repartidorAsignadoAt?: string | null;
  pagoReferencia?: string | null;
  pagoConfirmadoAt?: string | null;
}

export interface Repartidor {
  id: number;
  nombreCompleto: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  fotoUrl?: string | null;
  motoMatricula?: string | null;
  estado?: 'libre' | 'ocupado' | 'inactivo' | string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastSeenAt?: string | null;
  isActive?: boolean;
}

export type VentaCreatePayload = {
  productosVendidos: VentaProductoInput[];
  total: number;
  totalExtra?: number;
  metodoPago?: string;
  recibido?: number;
  vuelto?: number;
  pagoReferencia?: string | null;
  clienteId?: number | null;
  clienteDni?: string | null;
  clienteNombre?: string | null;
  direccionEntrega?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
};

export interface Usuario {
  username: string;
  rol?: string;
  name?: string;
}

export interface Credenciales {
  username: string;
  password: string;
}

export interface DashboardStats {
  productosActivos: number;
  ventasHoy: number;
  ingresosHoy: number;
  productosBajos: number;
  productosVendidos: number;
} 
