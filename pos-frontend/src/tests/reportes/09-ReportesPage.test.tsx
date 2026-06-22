/*
 * MAPA DEL ARCHIVO: PRUEBA FRONTEND
 * UBICACION: pos-frontend/src/tests/reportes/09-ReportesPage.test.tsx
 * QUE HACE: Prueba la pantalla de reportes de ventas: carga, filtro, resumen y detalle.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ReportesPage from '../../pages/09-ReportesPage';
import { getDashboardStats, getVentas } from '../../services/api';
import { DashboardStats, User, Venta } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// MOCK REPORTES - SERVICIOS:
// Evita llamadas reales al backend y permite controlar las estadisticas y ventas.
jest.mock('../../services/api', () => ({
  getDashboardStats: jest.fn(),
  getVentas: jest.fn()
}));

// MOCK REPORTES - AUTENTICACION:
// Permite probar el modulo como administrador o como cajero.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockT = (spanishText: string) => spanishText;

// MOCK REPORTES - IDIOMA:
// Mantiene los textos en espanol para que las pruebas busquen los labels reales de la pantalla.
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: mockT
  })
}));

const adminUser: User = {
  id: 1,
  nombreUsuario: 'admin',
  nombreCompleto: 'Administrador',
  rol: 'ADMINISTRADOR'
};

const cajeroUser: User = {
  id: 2,
  nombreUsuario: 'caja01',
  nombreCompleto: 'Caja Uno',
  rol: 'CAJERO'
};

// DATOS TEST - ESTADISTICAS:
// Representa la respuesta que llega desde getDashboardStats.
const statsBase: DashboardStats = {
  productosActivos: 16,
  ventasHoy: 2,
  ingresosHoy: 150,
  productosBajos: 3,
  productosVendidos: 5
};

// DATOS TEST - VENTAS:
// Dos ventas en fechas distintas para probar filtro, tabla, resumen y modal de detalle.
const ventasBase: Venta[] = [
  {
    id: 10,
    fecha: '2026-06-15T15:30:00.000Z',
    clienteNombre: 'Cliente Prueba',
    clienteDni: '12345678',
    total: 100,
    metodoPago: 'efectivo',
    recibido: 120,
    vuelto: 20,
    productosVendidos: [
      {
        cantidad: 2,
        producto: {
          id: 1,
          nombre: 'Arroz Costeno',
          descripcion: 'Bolsa 1kg',
          precioVenta: 25,
          stockActual: 20,
          categoriaId: 1
        }
      },
      {
        cantidad: 1,
        producto: {
          id: 2,
          nombre: 'Aceite Primor',
          descripcion: 'Botella 1L',
          precioVenta: 50,
          stockActual: 12,
          categoriaId: 1
        }
      }
    ]
  },
  {
    id: 11,
    fecha: '2026-06-16T10:00:00.000Z',
    clienteNombre: null,
    clienteDni: null,
    total: 50,
    metodoPago: 'yape',
    recibido: 50,
    vuelto: 0,
    productosVendidos: [
      {
        cantidad: 1,
        producto: {
          id: 3,
          nombre: 'Leche Gloria',
          descripcion: 'Tarro',
          precioVenta: 50,
          stockActual: 30,
          categoriaId: 2
        }
      }
    ]
  }
];

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetDashboardStats = getDashboardStats as jest.MockedFunction<typeof getDashboardStats>;
const mockedGetVentas = getVentas as jest.MockedFunction<typeof getVentas>;
const originalConsoleError = console.error;

// HELPER TEST - WARNINGS CONOCIDOS:
// Oculta el warning de React 18/Testing Library para que no se confunda con un fallo real.
const muteKnownReactWarnings = () => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] || '');
    const isKnownWarning = message.includes('Warning: `ReactDOMTestUtils.act` is deprecated');

    if (!isKnownWarning) {
      originalConsoleError(...args);
    }
  });
};

// HELPER TEST - TEXTO COMPUESTO:
// Sirve para validar textos donde React separa label y valor con <strong>.
const expectTextContent = (text: string) => {
  expect(screen.getByText((_, element) => element?.textContent === text)).toBeInTheDocument();
};

// HELPER TEST - TEXTO COMPUESTO DENTRO DE UN CONTENEDOR:
// Sirve para validar textos del modal donde label y valor estan separados por etiquetas internas.
const expectTextContentWithin = (container: HTMLElement, text: string) => {
  expect(within(container).getByText((_, element) => element?.textContent === text)).toBeInTheDocument();
};

// HELPER TEST - RENDER ADMIN:
// Renderiza ReportesPage como administrador y espera que se cargue la primera venta.
const renderAsAdmin = async (ventas: Venta[] = ventasBase, stats: DashboardStats = statsBase) => {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    user: adminUser
  });
  mockedGetDashboardStats.mockResolvedValue(stats);
  mockedGetVentas.mockResolvedValue(ventas);

  render(<ReportesPage />);

  await screen.findByText('#10');
};

describe('ReportesPage ventas', () => {
  // TEST SETUP:
  // Limpia llamadas anteriores para que cada prueba valide solo su propio escenario.
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
  // TEST ACCESO / PERMISOS
  // ============================================================
  // Objetivo:
  // - Verifica que un cajero no pueda consultar reportes.
  // - Confirma que no se llamen los servicios del backend.
  it('muestra advertencia si el usuario no es administrador', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      user: cajeroUser
    });

    render(<ReportesPage />);

    expect(screen.getByText('Solo el administrador puede consultar reportes.')).toBeInTheDocument();
    expect(mockedGetDashboardStats).not.toHaveBeenCalled();
    expect(mockedGetVentas).not.toHaveBeenCalled();
  });

  // ============================================================
  // TEST CARGA DE REPORTES
  // ============================================================
  // Objetivo:
  // - Simula la carga de estadisticas y ventas desde el backend.
  // - Verifica que las tarjetas y la tabla muestren los datos recibidos.
  it('carga estadisticas y ventas en la tabla de reportes', async () => {
    await renderAsAdmin();

    await waitFor(() => {
      expect(mockedGetDashboardStats).toHaveBeenCalledTimes(1);
      expect(mockedGetVentas).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Reportes y Estadísticas')).toBeInTheDocument();
    expect(screen.getByText('Productos Activos')).toBeInTheDocument();
    expect(screen.getByText('Ventas Hoy')).toBeInTheDocument();
    expect(screen.getByText('Ingresos Hoy')).toBeInTheDocument();
    expect(screen.getByText('Productos Bajos')).toBeInTheDocument();
    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.getByText('#11')).toBeInTheDocument();
    expect(screen.getByText('Cliente Prueba')).toBeInTheDocument();
    expect(screen.getByText('Publico en general')).toBeInTheDocument();
    expect(screen.getByText('Arroz Costeno x2 (S/ 25.00 c/u)')).toBeInTheDocument();
  });

  // ============================================================
  // TEST FILTRO POR FECHA Y RESUMEN
  // ============================================================
  // Objetivo:
  // - Cambia el campo "Fecha de ventas".
  // - Verifica que la tabla solo muestre las ventas del dia seleccionado.
  // - Valida que el resumen final use solamente las ventas filtradas.
  it('filtra ventas por fecha y actualiza el resumen del dia', async () => {
    await renderAsAdmin();

    fireEvent.change(screen.getByLabelText('Fecha de ventas'), {
      target: { value: '2026-06-15' }
    });

    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.queryByText('#11')).not.toBeInTheDocument();
    expect(screen.getByText('Resumen del Día')).toBeInTheDocument();
    expectTextContent('Total de ventas: 1');
    expectTextContent('Promedio por venta: S/ 100.00');
    expectTextContent('Ingresos totales: S/ 100.00');
    expectTextContent('Productos vendidos: 3');
  });

  // ============================================================
  // TEST BOTON VER DETALLES
  // ============================================================
  // Objetivo:
  // - Presiona el boton "Ver detalles" de una venta.
  // - Verifica que el modal muestre productos, total y datos de pago.
  it('abre el detalle de una venta al presionar Ver detalles', async () => {
    await renderAsAdmin();

    // TEST DETALLE - ACCION:
    // Presiona el primer boton "Ver detalles", que corresponde a la venta #10.
    fireEvent.click(screen.getAllByRole('button', { name: /ver detalles/i })[0]);

    const dialog = await screen.findByRole('dialog');
    expectTextContentWithin(dialog, 'Detalle de Venta #10');
    expectTextContentWithin(dialog, 'Cliente: Cliente Prueba');
    expectTextContentWithin(dialog, 'Arroz Costeno x2');
    expectTextContentWithin(dialog, 'Aceite Primor x1');
    expectTextContentWithin(dialog, 'Total: S/ 100.00');
    expectTextContentWithin(dialog, 'Método de pago: efectivo');
    expectTextContentWithin(dialog, 'Monto recibido: S/ 120.00');
    expectTextContentWithin(dialog, 'Vuelto entregado: S/ 20.00');
  });
});
