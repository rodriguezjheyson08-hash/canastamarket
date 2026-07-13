/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/03-Dashboard.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Badge
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import {
  Dashboard as DashboardIcon,
  Inventory,
  Category,
  PointOfSale,
  Business,
  Assessment,
  Settings,
  ShoppingBag,
  Assignment,
  AttachMoney,
  Warning
} from '@mui/icons-material';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats, getPedidosOnline } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { DashboardStats, PedidoOnline, PermissionKey } from '../types';
import LockIcon from '@mui/icons-material/Lock';
import { canAccess } from '../utils/permissions';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';
import { PEDIDOS_ONLINE_UPDATE_EVENT } from '../components/layout/Header';

// DISEÑO - CAJA DE DATOS DEL DASHBOARD:
// Este componente arma la tarjeta superior donde se muestran los indicadores
// como "Productos Activos", "Ventas Hoy", "Ingresos Hoy" y "Productos Bajos".
const StatCard = ({ title, value, loading, icon }: { title: string; value: string | number, loading: boolean; icon: React.ReactNode }) => {
    return (
        // DISEÑO: Card es la caja blanca; aqui se define padding, ancho, alto minimo,
        // direccion vertical, alineacion hacia la izquierda y sombra.
        <Card sx={{ p: 3, width: '100%', minHeight: 120, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, height: '100%' }}>
                <Box sx={{ minWidth: 0 }}>
                    {/* DISEÑO: titulo pequeno de la caja, por ejemplo "Ventas Hoy". */}
                    <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
                    {loading ? (
                         // DISEÑO: esqueleto/carga visual mientras llegan los datos del backend.
                         <Skeleton className="w-2/3 h-8 mt-1" />
                    ) : (
                        // DISEÑO: numero grande en negrita que aparece dentro de la caja.
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>{value}</Typography>
                    )}
                </Box>
                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
            </Box>
        </Card>
    );
};

const isPedidoOnlinePendiente = (pedido: PedidoOnline) => (
  ['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO'].includes(pedido.estado)
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const config = useAppConfig();
  const { t } = useI18n();

  const menuItems: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    path?: string;
    color: string;
    permission?: PermissionKey;
    designOnly?: boolean;
    disabled?: boolean;
  }> = [
    {
      title: 'Ventas',
      description: t('Registrar y gestionar ventas', 'Register and manage sales'),
      icon: <PointOfSale sx={{ fontSize: 40 }} />,
      path: '/dashboard/ventas',
      color: '#f57c00',
      permission: 'ventas'
    },
    {
      title: 'Pedidos Online',
      description: t('Atender compras realizadas por clientes', 'Manage customer online orders'),
      icon: <ShoppingBag sx={{ fontSize: 40 }} />,
      path: '/dashboard/pedidos-online',
      color: '#ad4773',
      permission: 'pedidosOnline'
    },
    {
      title: 'Productos',
      description: t('Gestionar inventario y productos', 'Manage inventory and products'),
      icon: <Inventory sx={{ fontSize: 40 }} />,
      path: '/dashboard/productos',
      color: '#1976d2',
      permission: 'productos'
    },
    {
      title: 'Operaciones',
      description: 'Movimientos, perdidas y auditoria',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      path: '/dashboard/inventario',
      color: '#455a64',
      permission: 'inventario'
    },
    {
      title: 'Categorías',
      description: t('Administrar categorías de productos', 'Manage product categories'),
      icon: <Category sx={{ fontSize: 40 }} />,
      path: '/dashboard/categorias',
      color: '#388e3c',
      permission: 'categorias'
    },
    {
      title: 'Proveedores',
      description: t('Gestionar proveedores', 'Manage suppliers'),
      icon: <Business sx={{ fontSize: 40 }} />,
      path: '/dashboard/proveedores',
      color: '#7b1fa2',
      permission: 'proveedores'
    },
    {
      title: 'Reportes',
      description: t('Consultar reportes del negocio', 'View business reports'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      color: '#00897b',
      path: '/dashboard/reportes',
      permission: 'reportes'
    },
    {
      title: 'Configuración',
      description: t('Configurar el sistema', 'Configure the system'),
      icon: <Settings sx={{ fontSize: 40 }} />,
      path: '/dashboard/configuracion',
      color: '#d32f2f',
      permission: 'configuracion'
    },
  ];

  // Mostrar menú solo en la ruta exacta /dashboard
  const isDashboardRoot = location.pathname === '/dashboard';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  useEffect(() => {
// LOGICA: fetch Stats concentra una operacion de este archivo.
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Aquí podrías mostrar una notificación de error al usuario
      } finally {
        setLoading(false);
      }
    };

    if (isDashboardRoot) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isDashboardRoot]);

  useEffect(() => {
    if (!isDashboardRoot || !canAccess(user, 'pedidosOnline')) {
      setPedidosPendientes(0);
      return undefined;
    }

    let active = true;
    const fetchPedidosPendientes = async () => {
      try {
        const pedidos = await getPedidosOnline();
        if (active) {
          setPedidosPendientes(pedidos.filter(isPedidoOnlinePendiente).length);
        }
      } catch (error) {
        if (active) setPedidosPendientes(0);
      }
    };

    fetchPedidosPendientes();
    globalThis.addEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, fetchPedidosPendientes);
    const intervalId = globalThis.setInterval(fetchPedidosPendientes, 30000);

    return () => {
      active = false;
      globalThis.removeEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, fetchPedidosPendientes);
      globalThis.clearInterval(intervalId);
    };
  }, [isDashboardRoot, user]);

  if (!isDashboardRoot) {
    return null;
  }

// LOGICA: format Currency concentra una operacion de este archivo.
  const formatCurrency = (value: number) => {
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" mb={2}>
          <DashboardIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            {t('Dashboard', 'Dashboard')}
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          {t('Bienvenido,', 'Welcome,')} {user?.nombreCompleto || user?.nombreUsuario}
        </Typography>
      </Box>

      {/* Estadísticas rápidas solo para administrador */}
      {isDashboardRoot && (
        <>
          {/* DISEÑO - FILA DE CAJAS DE DATOS:
              Grid ordena las 4 tarjetas superiores de forma horizontal en desktop
              y las acomoda en columnas cuando la pantalla es pequena. */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={<Inventory sx={{ fontSize: 34, color: '#1976d2' }} />} title={t('Productos Activos', 'Active Products')} loading={loading} value={stats?.productosActivos ?? 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={<PointOfSale sx={{ fontSize: 34, color: '#2e7d32' }} />} title={t('Ventas Hoy', 'Sales Today')} loading={loading} value={stats?.ventasHoy ?? 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={<AttachMoney sx={{ fontSize: 34, color: '#ef6c00' }} />} title={t('Ingresos Hoy', 'Revenue Today')} loading={loading} value={stats ? formatCurrency(stats.ingresosHoy) : 'S/ 0.00'} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard icon={<Warning sx={{ fontSize: 34, color: '#d32f2f' }} />} title={t('Productos Bajos', 'Low Stock Products')} loading={loading} value={stats?.productosBajos ?? 0} />
            </Grid>
          </Grid>
        </>
      )}

      {/* DISEÑO - TITULO DE LA SECCION DE CARTAS DEL MENU PRINCIPAL */}
      <Typography variant="h5" gutterBottom mb={3}>
        {t('Funciones Principales', 'Main Functions')}
      </Typography>
      {/* DISEÑO - CONTENEDOR DE CARTAS:
          Grid distribuye las cajas de Ventas, Productos, Categorias, etc.
          xs/sm/lg/xl define cuantas columnas ocupa cada tarjeta segun la pantalla. */}
      <Grid container spacing={3}>
        {menuItems.map((item) => {
          const isDesignOnly = item.designOnly === true;
          const isDisabled = item.disabled === true;
          const hasPermission = isDesignOnly || !item.permission || canAccess(user, item.permission);
          const isEnabled = !isDisabled && hasPermission;
          const itemPath = item.path;
          const handleCardClick = !isDesignOnly && isEnabled && itemPath ? () => navigate(itemPath) : undefined;
          return (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={item.title}>
              {/* DISEÑO: Box sirve como contenedor relativo para poder poner el candado encima si no hay permiso. */}
              <Box position="relative">
                {/* DISEÑO - CAJA/CARTA DEL MENU:
                    Esta Card es la caja blanca clickeable de cada modulo.
                    Aqui se define cursor, filtro, opacidad y transicion visual. */}
                <Card
                  sx={{
                    height: '100%',
                    cursor: isDesignOnly || isDisabled ? 'default' : isEnabled ? 'pointer' : 'not-allowed',
                    filter: hasPermission ? 'none' : 'blur(2px) grayscale(0.5)',
                    pointerEvents: 'auto',
                    transition: 'filter 0.2s',
                    opacity: isDisabled ? 0.7 : hasPermission ? 1 : 0.7,
                  }}
                  onClick={handleCardClick}
                >
                  {/* DISEÑO: contenido centrado dentro de la carta, con espacio vertical. */}
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    {/* DISEÑO: icono superior de la carta; el color viene de item.color. */}
                    <Box sx={{ color: item.color, mb: 2 }}>
                      {item.permission === 'pedidosOnline' ? (
                        <Badge badgeContent={pedidosPendientes} color="error" invisible={pedidosPendientes === 0}>
                          {item.icon}
                        </Badge>
                      ) : item.icon}
                    </Box>
                    {/* DISEÑO: nombre principal de la carta, por ejemplo "Ventas". */}
                    <Typography variant="h6" component="h3" gutterBottom>
                      {item.title}
                    </Typography>
                    {/* DISEÑO: descripcion pequena debajo del titulo. */}
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
                {!hasPermission && (
                  // DISEÑO: capa con candado encima de la carta cuando el usuario no tiene permiso.
                  <Box position="absolute" top={0} left={0} width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" zIndex={2}>
                    <LockIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Aquí se renderizan las subpáginas */}
      <Outlet />

      {/* Información adicional */}
      <Box sx={{ mt: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('Información del Sistema', 'System Information')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {config.appName} v1.0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Usuario:', 'User:')} {user?.nombreCompleto || user?.nombreUsuario}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard; 
