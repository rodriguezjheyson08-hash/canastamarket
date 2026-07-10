/*
 * MAPA DEL ARCHIVO: PRUEBA FRONTEND
 * UBICACION: pos-frontend/src/tests/dashboard/03-Dashboard.test.tsx
 * QUE HACE: Prueba la visualizacion del dashboard del negocio.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Dashboard from '../../pages/03-Dashboard';
import { getDashboardStats, getPedidosOnline } from '../../services/api';
import { DashboardStats, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// MOCK DASHBOARD - SERVICIOS:
// Evita llamar al backend real y permite controlar las estadisticas del negocio.
jest.mock('../../services/api', () => ({
  getDashboardStats: jest.fn(),
  getPedidosOnline: jest.fn()
}));

// MOCK DASHBOARD - AUTENTICACION:
// Permite probar la pantalla como administrador o como cajero.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockT = (spanishText: string) => spanishText;

// MOCK DASHBOARD - IDIOMA:
// Mantiene los textos en espanol para buscar labels reales en las pruebas.
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: mockT
  })
}));

// MOCK DASHBOARD - CONFIGURACION:
// Simula el nombre del negocio que se muestra en Informacion del Sistema.
jest.mock('../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({
    appName: 'MINI MARKET TEST',
    idioma: 'es',
    moneda: 'S/',
    logo: '',
    userImg: ''
  })
}));

const adminUser: User = {
  id: 1,
  nombreUsuario: 'admin',
  nombreCompleto: 'Administrador Principal',
  rol: 'ADMINISTRADOR'
};

const cajeroUser: User = {
  id: 2,
  nombreUsuario: 'caja01',
  nombreCompleto: 'Caja Uno',
  rol: 'CAJERO',
  permisos: {
    ventas: true,
    productos: false,
    categorias: false,
    proveedores: false,
    configuracion: false
  }
};

// DATOS TEST - ESTADISTICAS:
// Representa los numeros que el dashboard recibe desde getDashboardStats.
const statsBase: DashboardStats = {
  productosActivos: 16,
  ventasHoy: 3,
  ingresosHoy: 1200.4,
  productosBajos: 8,
  productosVendidos: 10
};

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetDashboardStats = getDashboardStats as jest.MockedFunction<typeof getDashboardStats>;
const mockedGetPedidosOnline = getPedidosOnline as jest.MockedFunction<typeof getPedidosOnline>;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// HELPER TEST - WARNINGS CONOCIDOS:
// Oculta el warning de React 18/Testing Library para que no se confunda con un fallo real.
const muteKnownReactWarnings = () => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] || '');
    const isKnownWarning =
      message.includes('Warning: `ReactDOMTestUtils.act` is deprecated') ||
      message.includes('Warning: An update to Dashboard inside a test was not wrapped in act');

    if (!isKnownWarning) {
      originalConsoleError(...args);
    }
  });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] || '');
    const isKnownWarning = message.includes('React Router Future Flag Warning');

    if (!isKnownWarning) {
      originalConsoleWarn(...args);
    }
  });
};

// HELPER TEST - RUTA ACTUAL:
// Muestra la ruta actual del MemoryRouter para comprobar navegacion al hacer click en una carta.
const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
};

// HELPER TEST - RENDER:
// Renderiza Dashboard dentro de MemoryRouter porque la pantalla usa useNavigate y useLocation.
const renderDashboard = (initialPath = '/dashboard') => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Dashboard />
      <LocationProbe />
    </MemoryRouter>
  );
};

// HELPER TEST - USUARIO ADMIN:
// Prepara usuario administrador y estadisticas falsas del negocio.
const mockAdminSession = () => {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    user: adminUser
  });
  mockedGetDashboardStats.mockResolvedValue(statsBase);
  mockedGetPedidosOnline.mockResolvedValue([]);
};

describe('Dashboard negocio', () => {
  // TEST SETUP:
  // Limpia mocks y silencia warnings conocidos antes de cada prueba.
  beforeEach(() => {
    jest.clearAllMocks();
    muteKnownReactWarnings();
  });

  // TEST CLEANUP:
  // Restaura console.error despues de cada prueba.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  // TEST VISUALIZAR DASHBOARD ADMIN
  // ============================================================
  // Objetivo:
  // - Renderiza el Dashboard como administrador.
  // - Valida titulo, bienvenida, tarjetas de indicadores y datos del sistema.
  it('muestra el dashboard del negocio con estadisticas para administrador', async () => {
    mockAdminSession();

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Bienvenido, Administrador Principal')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedGetDashboardStats).toHaveBeenCalledTimes(1);
    });
    await screen.findByText('16');

    expect(screen.getByText('Productos Activos')).toBeInTheDocument();
    expect(screen.getByText('Ventas Hoy')).toBeInTheDocument();
    expect(screen.getByText('Ingresos Hoy')).toBeInTheDocument();
    expect(screen.getByText('Productos Bajos')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('S/ 1,200.40')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Información del Sistema')).toBeInTheDocument();
    expect(screen.getByText('MINI MARKET TEST v1.0')).toBeInTheDocument();
  });

  // ============================================================
  // TEST CARTAS DE FUNCIONES PRINCIPALES
  // ============================================================
  // Objetivo:
  // - Valida que se muestren las cartas de modulos principales del negocio.
  // - Confirma que cada carta tenga titulo y descripcion.
  it('muestra las cartas principales de modulos del negocio', async () => {
    mockAdminSession();

    renderDashboard();

    await screen.findByText('16');
    await screen.findByText('Funciones Principales');

    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Registrar y gestionar ventas')).toBeInTheDocument();
    expect(screen.getByText('Productos')).toBeInTheDocument();
    expect(screen.getByText('Gestionar inventario y productos')).toBeInTheDocument();
    expect(screen.getByText('Categorías')).toBeInTheDocument();
    expect(screen.getByText('Administrar categorías de productos')).toBeInTheDocument();
    expect(screen.getByText('Proveedores')).toBeInTheDocument();
    expect(screen.getByText('Gestionar proveedores')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Consultar reportes del negocio')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Configurar el sistema')).toBeInTheDocument();
  });

  // ============================================================
  // TEST NAVEGACION DESDE CARTA
  // ============================================================
  // Objetivo:
  // - Presiona la carta Ventas.
  // - Verifica que el Dashboard cambie la ruta a /dashboard/ventas.
  it('navega al modulo de ventas al presionar la carta Ventas', async () => {
    mockAdminSession();

    renderDashboard();

    await screen.findByText('16');
    await screen.findByText('Ventas');
    fireEvent.click(screen.getByText('Ventas'));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard/ventas');
  });

  // ============================================================
  // TEST USUARIO CAJERO
  // ============================================================
  // Objetivo:
  // - Renderiza el Dashboard como cajero.
  // - Verifica que no se carguen las estadisticas administrativas.
  // - Mantiene visible la seccion de funciones principales.
  it('muestra dashboard basico para cajero sin cargar estadisticas administrativas', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      user: cajeroUser
    });

    renderDashboard();

    expect(screen.getByText('Bienvenido, Caja Uno')).toBeInTheDocument();
    expect(screen.getByText('Funciones Principales')).toBeInTheDocument();
    expect(screen.queryByText('Productos Activos')).not.toBeInTheDocument();
    expect(mockedGetDashboardStats).not.toHaveBeenCalled();
  });
});
