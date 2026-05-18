import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import InicioPage from './pages/InicioPage';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import { WorkerContactActionBar } from './components/common/ContactActionBar';
import { CssBaseline } from '@mui/material';
import { useEffect } from 'react';
import { PermissionKey } from './types';
import { canAccess } from './utils/permissions';
import { useAppConfig } from './hooks/useAppConfig';
import { ClienteAuthProvider, useClienteAuth } from './contexts/ClienteAuthContext';
import { ClienteCartProvider } from './contexts/ClienteCartContext';
import ClientePerfilPage from './pages/ClientePerfilPage';
import { useTiendaConfig } from './hooks/useTiendaConfig';
import { DEFAULT_APP_CONFIG, loadAppConfig, saveMergedAppConfig } from './utils/appConfig';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductosPage = lazy(() => import('./pages/ProductosPage'));
const ProveedoresPage = lazy(() => import('./pages/ProveedoresPage'));
const CategoriasPage = lazy(() => import('./pages/04-CategoriasPage'));
const VentasPage = lazy(() => import('./pages/VentasPage'));
const PedidosPage = lazy(() => import('./pages/PedidosPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const DetalleCajeroPage = lazy(() => import('./pages/DetalleCajeroPage'));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'));
const MesasPage = lazy(() => import('./pages/MesasPage'));
const RepartidorPage = lazy(() => import('./pages/RepartidorPage'));
const RepartidorConfigPage = lazy(() => import('./pages/RepartidorConfigPage'));

const ClienteRegisterPage = lazy(() => import('./pages/ClienteRegisterPage'));
const TiendaPage = lazy(() => import('./pages/TiendaPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CheckoutResultadoPage = lazy(() => import('./pages/CheckoutResultadoPage'));
const PedidoTrackingPage = lazy(() => import('./pages/PedidoTrackingPage'));

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Mostrar BackButton en todas las subrutas de dashboard excepto en /dashboard
  const showBack = location.pathname.startsWith('/dashboard/') && location.pathname !== '/dashboard';
  return (
    <>
      <Header showBack={showBack} />
      <WorkerContactActionBar />
      {/* {showBack && <BackButton />} */}
      {children}
    </>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const FeatureRoute: React.FC<{ permission: PermissionKey; children: React.ReactNode }> = ({ permission, children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return canAccess(user, permission) ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const WorkerConfigRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!canAccess(user, 'configuracion')) return <Navigate to="/dashboard" replace />;
  return String(user?.rol || '').toUpperCase() === 'REPARTIDOR' ? <RepartidorConfigPage /> : <ConfiguracionPage />;
};

const ClientePrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useClienteAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
};

const SharedAppConfigSync: React.FC = () => {
  useAppConfig();
  const { isAuthenticated, loading } = useAuth();
  const { config: tiendaConfig, save: saveTiendaConfig } = useTiendaConfig({ enabled: isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!tiendaConfig) return;

    const nextSharedConfig: { appName?: string; logo?: string } = {};
    if (tiendaConfig.appName) {
      nextSharedConfig.appName = tiendaConfig.appName;
    }
    if (tiendaConfig.logo !== null && tiendaConfig.logo !== undefined) {
      nextSharedConfig.logo = tiendaConfig.logo;
    }
    if (Object.keys(nextSharedConfig).length > 0) {
      saveMergedAppConfig(nextSharedConfig);
    }
  }, [isAuthenticated, tiendaConfig]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (!tiendaConfig) return;
    if (tiendaConfig.appName || tiendaConfig.logo) return;

    const localConfig = loadAppConfig();
    const hasCustomLocalName = localConfig.appName.trim() && localConfig.appName !== DEFAULT_APP_CONFIG.appName;
    const hasLocalLogo = Boolean(localConfig.logo.trim());

    if (!hasCustomLocalName && !hasLocalLogo) return;

    void saveTiendaConfig({
      appName: hasCustomLocalName ? localConfig.appName.trim() : null,
      logo: hasLocalLogo ? localConfig.logo.trim() : null
    });
  }, [isAuthenticated, loading, tiendaConfig, saveTiendaConfig]);

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CssBaseline />
      <ClienteAuthProvider>
        <ClienteCartProvider>
          <SharedAppConfigSync />
          <Router>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Suspense fallback={<div style={{ padding: 16, textAlign: 'center' }}>Cargando...</div>}>
                <Routes>
                  <Route path="/" element={<InicioPage />} />
                  <Route path="/login" element={<AuthPage />} />

                {/* Clientes */}
                <Route path="/clientes/registro" element={<ClienteRegisterPage />} />
                <Route path="/clientes/login" element={<Navigate to="/login" replace />} />
                <Route path="/tienda" element={<ClientePrivateRoute><TiendaPage /></ClientePrivateRoute>} />
                <Route path="/checkout" element={<ClientePrivateRoute><CheckoutPage /></ClientePrivateRoute>} />
                <Route path="/checkout/resultado" element={<ClientePrivateRoute><CheckoutResultadoPage /></ClientePrivateRoute>} />
                <Route path="/perfil" element={<ClientePrivateRoute><ClientePerfilPage /></ClientePrivateRoute>} />
                <Route path="/pedido/:ventaId/seguimiento" element={<ClientePrivateRoute><PedidoTrackingPage /></ClientePrivateRoute>} />

                  {/* Dashboard (trabajadores) */}
                  <Route
                    path="/dashboard/*"
                    element={
                      <PrivateRoute>
                        <PrivateLayout>
                          <Routes>
                            <Route path="" element={<Dashboard />} />
                            <Route path="productos" element={<FeatureRoute permission="productos"><ProductosPage /></FeatureRoute>} />
                            <Route path="proveedores" element={<FeatureRoute permission="proveedores"><ProveedoresPage /></FeatureRoute>} />
                            <Route path="categorias" element={<FeatureRoute permission="categorias"><CategoriasPage /></FeatureRoute>} />
                            <Route path="ventas" element={<FeatureRoute permission="ventas"><VentasPage /></FeatureRoute>} />
                            <Route path="pedidos" element={<FeatureRoute permission="pedidos"><PedidosPage /></FeatureRoute>} />
                            <Route path="reparto" element={<FeatureRoute permission="reparto"><RepartidorPage /></FeatureRoute>} />
                            <Route path="reportes" element={<FeatureRoute permission="reportes"><ReportesPage /></FeatureRoute>} />
                            <Route path="detalle-cajero" element={<FeatureRoute permission="detalleCajero"><DetalleCajeroPage /></FeatureRoute>} />
                            <Route path="configuracion" element={<WorkerConfigRoute />} />
                            <Route path="mesas" element={<FeatureRoute permission="mesas"><MesasPage /></FeatureRoute>} />
                          </Routes>
                        </PrivateLayout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/repartidor"
                    element={
                      <PrivateRoute>
                        <Navigate to="/dashboard/reparto" replace />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <Footer />
            </div>
          </Router>
        </ClienteCartProvider>
      </ClienteAuthProvider>
    </AuthProvider>
  );
};

export default App; 
