import React, { useEffect, useRef, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory,
  Category,
  PointOfSale,
  LocalShipping,
  Assessment,
  Settings,
  Badge,
  Business,
  TwoWheeler
} from '@mui/icons-material';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { DashboardStats, PermissionKey } from '../types';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import LockIcon from '@mui/icons-material/Lock';
import { canAccess } from '../utils/permissions';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';
import { getPedidos } from '../services/pedidos';
import { getRepartidorDashboard } from '../services/reparto';

const StatCard = ({ title, value, loading }: { title: string; value: string | number, loading: boolean }) => {
    return (
        <Card sx={{ p: 3, width: '100%', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', boxShadow: 3 }}>
            <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
            {loading ? (
                 <Skeleton className="w-2/3 h-8 mt-1" />
            ) : (
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>{value}</Typography>
            )}
        </Card>
    );
};

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
    path: string;
    color: string;
    permission: PermissionKey;
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
      title: 'Pedidos',
      description: t('Aceptar y actualizar pedidos de clientes', 'Accept and update customer orders'),
      icon: <LocalShipping sx={{ fontSize: 40 }} />,
      path: '/dashboard/pedidos',
      color: '#2e7d32',
      permission: 'pedidos'
    },
    {
      title: 'Reparto',
      description: t('Ver asignaciones, ruta y entregas del repartidor', 'View courier assignments, route and deliveries'),
      icon: <TwoWheeler sx={{ fontSize: 40 }} />,
      path: '/dashboard/reparto',
      color: '#1565c0',
      permission: 'reparto'
    },
    {
      title: 'Mesas',
      description: t('Gestiona el tiempo y cobro de las mesas de billar', 'Manage billiard table time and charges'),
      icon: <SportsBarIcon sx={{ fontSize: 40 }} />,
      path: '/dashboard/mesas',
      color: '#009688',
      permission: 'mesas'
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
      title: 'Proveedores',
      description: t('Gestionar proveedores y pedidos de compra', 'Manage suppliers and purchase orders'),
      icon: <Business sx={{ fontSize: 40 }} />,
      path: '/dashboard/proveedores',
      color: '#6a1b9a',
      permission: 'proveedores'
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
      title: 'Reportes',
      description: t('Ver estadísticas y reportes', 'View statistics and reports'),
      icon: <Assessment sx={{ fontSize: 40 }} />,
      path: '/dashboard/reportes',
      color: '#7b1fa2',
      permission: 'reportes'
    },
    {
      title: 'Detalle Cajero',
      description: t('Filtrar ventas por cajero y hora', 'Filter sales by cashier and time'),
      icon: <Badge sx={{ fontSize: 40 }} />,
      path: '/dashboard/detalle-cajero',
      color: '#455a64',
      permission: 'detalleCajero'
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
  const [pendingCount, setPendingCount] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const lastPendingIdsRef = useRef<number[]>([]);

  useEffect(() => {
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

    if (isDashboardRoot && user?.rol === 'ADMINISTRADOR') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isDashboardRoot, user?.rol]);

  useEffect(() => {
    if (!isDashboardRoot) return;
    if (!user) return;

    let cancelled = false;
    const loadWorkerQueue = async () => {
      try {
        const isRepartidor = String(user?.rol || '').toUpperCase() === 'REPARTIDOR';
        if (isRepartidor && canAccess(user, 'reparto') && user?.id) {
          const data = await getRepartidorDashboard(Number(user.id));
          const next = Number(data?.stats?.activos || 0);
          if (!cancelled) {
            setPendingCount(next);
            if (next > lastPendingIdsRef.current.length) {
              const newCount = next - lastPendingIdsRef.current.length;
              setSnack({ open: true, message: `${newCount} asignación(es) activa(s)` });
            }
            lastPendingIdsRef.current = new Array(next).fill(0);
          }
          return;
        }

        if (!canAccess(user, 'pedidos')) {
          if (!cancelled) setPendingCount(0);
          return;
        }

        const data = await getPedidos('pendiente');
        const list = Array.isArray(data) ? data : [];
        const ids = list.map((p) => p.id);
        if (!cancelled) {
          setPendingCount(ids.length);
          const prev = lastPendingIdsRef.current;
          const newCount = ids.filter((id) => !prev.includes(id)).length;
          lastPendingIdsRef.current = ids;
          if (newCount > 0) {
            setSnack({ open: true, message: `${newCount} pedido(s) nuevo(s)` });
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nuevo pedido', { body: `${newCount} pedido(s) pendiente(s)` });
            }
          }
        }
      } catch {
        if (!cancelled) {
          setPendingCount(0);
        }
      }
    };

    void loadWorkerQueue();
    const interval = window.setInterval(() => {
      void loadWorkerQueue();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDashboardRoot, user?.id, user?.rol, user?.permisos]);

  if (!isDashboardRoot) {
    return null;
  }

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
      {isDashboardRoot && user?.rol === 'ADMINISTRADOR' && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title={t('Productos Activos', 'Active Products')} loading={loading} value={stats?.productosActivos ?? 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title={t('Ventas Hoy', 'Sales Today')} loading={loading} value={stats?.ventasHoy ?? 0} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title={t('Ingresos Hoy', 'Revenue Today')} loading={loading} value={stats ? formatCurrency(stats.ingresosHoy) : 'S/ 0.00'} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard title={t('Productos Bajos', 'Low Stock Products')} loading={loading} value={stats?.productosBajos ?? 0} />
            </Grid>
          </Grid>
        </>
      )}

      {/* Menú principal */}
      <Typography variant="h5" gutterBottom mb={3}>
        {String(user?.rol || '').toUpperCase() === 'REPARTIDOR'
          ? t('Módulos disponibles', 'Available modules')
          : t('Funciones Principales', 'Main Functions')}
      </Typography>
      <Grid container spacing={3}>
        {menuItems.map((item) => {
          const isEnabled = canAccess(user, item.permission);
          const isRepartidor = String(user?.rol || '').toUpperCase() === 'REPARTIDOR';
          const showPending =
            (
              item.permission === 'pedidos' && pendingCount > 0 && canAccess(user, 'pedidos')
            ) ||
            (
              item.permission === 'reparto' && pendingCount > 0 && isRepartidor && canAccess(user, 'reparto')
            );
          return (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={item.title}>
              <Box position="relative">
                <Card
                  sx={{
                    height: '100%',
                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                    filter: isEnabled ? 'none' : 'blur(2px) grayscale(0.5)',
                    pointerEvents: isEnabled ? 'auto' : 'none',
                    transition: 'filter 0.2s',
                    opacity: isEnabled ? 1 : 0.7,
                  }}
                  onClick={isEnabled ? () => navigate(item.path) : undefined}
                >
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ color: item.color, mb: 2 }}>
                      {item.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                    {showPending && (
                      <Box mt={1.5}>
                        <Chip
                          color="warning"
                          label={
                            item.permission === 'reparto'
                              ? `${pendingCount} asignación(es)`
                              : `${pendingCount} pendiente(s)`
                          }
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
                {!isEnabled && (
                  <Box position="absolute" top={0} left={0} width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" zIndex={2}>
                    <LockIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

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
