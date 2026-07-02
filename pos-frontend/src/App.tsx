/*
 * MAPA DEL ARCHIVO: APP FRONTEND
 * UBICACION: pos-frontend/src/App.tsx
 * QUE HACE: Define rutas, proteccion por permisos y carga de paginas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// APP FRONTEND - RUTAS:
// Define la navegacion principal, lazy loading de paginas y proteccion por permisos.
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { AuthProvider, useAuth } from './contexts/AuthContext';

import InicioPage from './pages/01-InicioPage';
import LoginPage from './pages/02-LoginPage';

import Footer from './components/layout/Footer';
import Header from './components/layout/Header';

import { PermissionKey } from './types';
import { canAccess } from './utils/permissions';
import { useAppConfig } from './hooks/useAppConfig';
import { appShellStyles, centeredFallbackStyles } from './styles/layout';

const Dashboard = lazy(() => import('./pages/03-Dashboard'));
const CategoriasPage = lazy(() => import('./pages/04-CategoriasPage'));
const ProductosPage = lazy(() => import('./pages/05-ProductosPage'));
const VentasPage = lazy(() => import('./pages/06-VentasPage'));
const ProveedoresPage = lazy(() => import('./pages/07-ProveedoresPage'));
const ConfiguracionPage = lazy(() => import('./pages/08-ConfiguracionPage'));
const ReportesPage = lazy(() => import('./pages/09-ReportesPage'));
const ClienteTiendaPage = lazy(() => import('./pages/10-ClienteTiendaPage'));
const PedidosOnlinePage = lazy(() => import('./pages/11-PedidosOnlinePage'));

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const showBack = location.pathname.startsWith('/dashboard/') && location.pathname !== '/dashboard';

  return (
    <>
      <Header showBack={showBack} />
      {children}
    </>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const FeatureRoute: React.FC<{ permission: PermissionKey; children: React.ReactNode }> = ({
  permission,
  children
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return canAccess(user, permission) ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const SharedAppConfigSync: React.FC = () => {
  useAppConfig();
  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CssBaseline />
      <SharedAppConfigSync />

      <Router>
        <Box sx={appShellStyles}>
          <Suspense fallback={<Box sx={centeredFallbackStyles}>Cargando...</Box>}>
            <Routes>
              <Route path="/" element={<ClienteTiendaPage />} />
              <Route path="/inicio" element={<InicioPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cliente" element={<ClienteTiendaPage />} />

              <Route
                path="/dashboard/*"
                element={
                  <PrivateRoute>
                    <PrivateLayout>
                      <Routes>
                        <Route path="" element={<Dashboard />} />
                        <Route
                          path="categorias"
                          element={
                            <FeatureRoute permission="categorias">
                              <CategoriasPage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="productos"
                          element={
                            <FeatureRoute permission="productos">
                              <ProductosPage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="ventas"
                          element={
                            <FeatureRoute permission="ventas">
                              <VentasPage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="pedidos-online"
                          element={
                            <FeatureRoute permission="pedidosOnline">
                              <PedidosOnlinePage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="proveedores"
                          element={
                            <FeatureRoute permission="proveedores">
                              <ProveedoresPage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="reportes"
                          element={
                            <FeatureRoute permission="reportes">
                              <ReportesPage />
                            </FeatureRoute>
                          }
                        />
                        <Route
                          path="configuracion"
                          element={
                            <FeatureRoute permission="configuracion">
                              <ConfiguracionPage />
                            </FeatureRoute>
                          }
                        />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </PrivateLayout>
                  </PrivateRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          <Footer />
        </Box>
      </Router>
    </AuthProvider>
  );
};

export default App;
