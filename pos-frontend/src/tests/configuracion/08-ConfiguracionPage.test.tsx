/*
 * MAPA DEL ARCHIVO: PRUEBA FRONTEND
 * UBICACION: pos-frontend/src/tests/configuracion/08-ConfiguracionPage.test.tsx
 * QUE HACE: Prueba la pantalla de configuracion: usuarios y permisos.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
// TEST FRONTEND - CONFIGURACION:
// Valida que la pantalla gestione usuarios, roles y permisos llamando a los servicios correctos.
// TEST FRONTEND - CAMBIOS: aqui se agregan casos cuando cambian acciones de usuarios/permisos.
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConfiguracionPage from '../../pages/08-ConfiguracionPage';
import { createUsuario, getUsuarios, saveConfiguracionSistema, updateUsuario } from '../../services/api';
import { UsuarioItem, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// MOCK FRONTEND: evita llamadas HTTP reales desde la pantalla de configuracion.
jest.mock('../../services/api', () => ({
  createUsuario: jest.fn(),
  deleteUsuario: jest.fn(),
  getConfiguracionSistema: jest.fn().mockResolvedValue({ personalizacion: null, boleta: null, vueltos: null }),
  getPersonaPorDni: jest.fn(),
  getUsuarios: jest.fn(),
  saveConfiguracionSistema: jest.fn(),
  unlockUsuario: jest.fn(),
  updateUsuario: jest.fn()
}));

// MOCK FRONTEND: controla el usuario autenticado usado para permisos de administrador.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockT = (spanishText: string) => spanishText;

// MOCK FRONTEND: mantiene los textos en español sin depender de configuracion global.
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

// DATOS TEST: usuario cajero inicial que aparece en la tabla de configuracion.
const usuariosBase: UsuarioItem[] = [
  {
    id: 2,
    nombre_usuario: 'caja01',
    nombre_completo: 'Caja Uno',
    rol: 'CAJERO',
    dni: '12345678',
    telefono: '987654321',
    email: 'caja01@test.local',
    permisos: {
      ventas: true,
      productos: true,
      categorias: true,
      proveedores: true,
      reportes: true,
      configuracion: false
    },
    failed_attempts: 0,
    lockouts: 0,
    lock_until: null,
    is_blocked: 0,
    is_active: 1
  }
];

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetUsuarios = getUsuarios as jest.MockedFunction<typeof getUsuarios>;
const mockedCreateUsuario = createUsuario as jest.MockedFunction<typeof createUsuario>;
const mockedUpdateUsuario = updateUsuario as jest.MockedFunction<typeof updateUsuario>;
const mockedSaveConfiguracionSistema = saveConfiguracionSistema as jest.MockedFunction<typeof saveConfiguracionSistema>;
const originalConsoleError = console.error;

// HELPER TEST: oculta warnings conocidos de React 18/Testing Library para que la salida muestre solo fallos reales.
const muteKnownReactWarnings = () => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] || '');
    const isKnownWarning =
      message.includes('Warning: `ReactDOMTestUtils.act` is deprecated') ||
      message.includes('Warning: An update to %s inside a test was not wrapped in act') ||
      message.includes('Warning: An update to ConfiguracionPage inside a test was not wrapped in act');

    if (!isKnownWarning) {
      originalConsoleError(...args);
    }
  });
};

// HELPER TEST: renderiza configuracion como administrador y espera que termine la carga inicial.
const renderAsAdmin = async (usuarios: UsuarioItem[] = usuariosBase) => {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    user: adminUser
  });
  mockedGetUsuarios.mockResolvedValue(usuarios);

  render(<ConfiguracionPage />);

  await screen.findByText('Caja Uno');
};

// HELPER TEST: obtiene la fila de tabla donde aparece un usuario.
const getUsuarioRow = (nombreUsuario: string) => {
  const text = screen.getByText(nombreUsuario);
  const row = text.closest('tr');
  if (!row) throw new Error(`No se encontro la fila para ${nombreUsuario}`);
  return row;
};

describe('ConfiguracionPage usuarios y permisos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    muteKnownReactWarnings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra advertencia si el usuario no es administrador', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      user: {
        id: 3,
        nombreUsuario: 'caja02',
        nombreCompleto: 'Caja Dos',
        rol: 'CAJERO'
      }
    });

    render(<ConfiguracionPage />);

    expect(screen.getByText('Solo el administrador puede gestionar usuarios.')).toBeInTheDocument();
    expect(mockedGetUsuarios).not.toHaveBeenCalled();
  });

  it('muestra los modulos habilitados, incluido reportes y sin pedidos online', async () => {
    await renderAsAdmin();

    expect(screen.getByLabelText('Ventas')).toBeInTheDocument();
    expect(screen.getByLabelText('Productos')).toBeInTheDocument();
    expect(screen.getByLabelText('Categorías')).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedores')).toBeInTheDocument();
    expect(screen.getByLabelText('Reportes')).toBeInTheDocument();
    expect(screen.getByLabelText('Configuración')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pedidos Online')).not.toBeInTheDocument();
  });

  it('crea un usuario cajero con permisos seleccionados', async () => {
    const usuarioCreado: UsuarioItem = {
      ...usuariosBase[0],
      id: 3,
      nombre_usuario: 'caja02',
      nombre_completo: 'Caja Dos',
      permisos: {
        ventas: true,
        productos: true,
        categorias: true,
        proveedores: true,
        reportes: true,
        configuracion: false
      }
    };
    mockedCreateUsuario.mockResolvedValue(usuarioCreado);
    mockedGetUsuarios
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([usuarioCreado]);

    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      user: adminUser
    });

    render(<ConfiguracionPage />);

    await screen.findByText('No hay usuarios registrados.');
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'caja02' } });
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Caja Dos' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave123' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    await waitFor(() => {
      expect(mockedCreateUsuario).toHaveBeenCalledWith(expect.objectContaining({
        nombreUsuario: 'caja02',
        nombreCompleto: 'Caja Dos',
        rol: 'CAJERO',
        password: 'Clave123',
        permisos: expect.objectContaining({
          ventas: true,
          productos: true,
          categorias: true,
          proveedores: true,
          reportes: true,
          configuracion: false
        })
      }));
    });
    await waitFor(() => expect(mockedGetUsuarios).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Usuario creado correctamente.')).toBeInTheDocument();
  });

  it('carga un usuario existente para editar y actualiza sus permisos', async () => {
    const usuarioEditado: UsuarioItem = {
      ...usuariosBase[0],
      nombre_completo: 'Caja Uno Editada',
      permisos: {
        ventas: true,
        productos: true,
        categorias: true,
        proveedores: true,
        reportes: true,
        configuracion: false
      }
    };
    mockedUpdateUsuario.mockResolvedValue(usuarioEditado);
    mockedGetUsuarios
      .mockResolvedValueOnce(usuariosBase)
      .mockResolvedValueOnce([usuarioEditado]);

    await renderAsAdmin();

    const row = getUsuarioRow('caja01');
    fireEvent.click(within(row).getAllByRole('button')[0]);

    expect(screen.getByDisplayValue('caja01')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Caja Uno Editada' } });
    fireEvent.click(screen.getByLabelText('Configuración'));
    const updateButtons = screen.getAllByRole('button', { name: /actualizar/i });
    fireEvent.click(updateButtons[updateButtons.length - 1]);

    await waitFor(() => {
      expect(mockedUpdateUsuario).toHaveBeenCalledWith(2, expect.objectContaining({
        nombreUsuario: 'caja01',
        nombreCompleto: 'Caja Uno Editada',
        rol: 'CAJERO',
        permisos: expect.objectContaining({
          ventas: true,
          productos: true,
          configuracion: true
        })
      }));
    });
    await waitFor(() => expect(mockedGetUsuarios).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Usuario actualizado correctamente.')).toBeInTheDocument();
  });

  it('fuerza todos los permisos cuando el rol seleccionado es administrador', async () => {
    const usuarioAdmin: UsuarioItem = {
      ...usuariosBase[0],
      id: 4,
      nombre_usuario: 'admin02',
      nombre_completo: 'Admin Dos',
      rol: 'ADMINISTRADOR',
      permisos: {
        ventas: true,
        productos: true,
        categorias: true,
        proveedores: true,
        configuracion: true
      }
    };
    mockedCreateUsuario.mockResolvedValue(usuarioAdmin);
    mockedGetUsuarios
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([usuarioAdmin]);

    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      user: adminUser
    });

    render(<ConfiguracionPage />);

    await screen.findByText('No hay usuarios registrados.');
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'admin02' } });
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Admin Dos' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave123' } });
    fireEvent.mouseDown(screen.getByLabelText('Rol'));
    fireEvent.click(screen.getByRole('option', { name: 'ADMINISTRADOR' }));
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    await waitFor(() => {
      expect(mockedCreateUsuario).toHaveBeenCalledWith(expect.objectContaining({
        nombreUsuario: 'admin02',
        nombreCompleto: 'Admin Dos',
        rol: 'ADMINISTRADOR',
        permisos: expect.objectContaining({
          ventas: true,
          productos: true,
          categorias: true,
          proveedores: true,
          configuracion: true
        })
      }));
    });
    await waitFor(() => expect(mockedGetUsuarios).toHaveBeenCalledTimes(2));
  });

  // ============================================================
  // TEST SISTEMA / PERSONALIZACION
  // ============================================================
  // Objetivo:
  // - Simula que el administrador cambia datos generales del sistema.
  // - Verifica que se envie al backend la configuracion "personalizacion".
  // Campos probados:
  // - Nombre de la aplicacion
  // - URL del logo
  // Boton probado:
  // - Guardar personalizacion
  it('guarda la configuración del sistema cuando cambia el nombre y logo', async () => {
    // TEST SISTEMA - RESPUESTA MOCK:
    // Define lo que responderia el backend despues de guardar la personalizacion.
    mockedSaveConfiguracionSistema.mockResolvedValue({
      personalizacion: {
        appName: 'MINI MARKET PRUEBA',
        idioma: 'es',
        moneda: 'S/',
        logo: '/imagenes/logo-prueba.png',
        userImg: '',
      },
      boleta: null,
      vueltos: null
    });

    // TEST SISTEMA - RENDER:
    // Abre la pantalla como administrador para que se muestre Configuracion del Sistema.
    await renderAsAdmin();

    // TEST SISTEMA - EDICION DE CAMPOS:
    // Cambia el nombre visible de la aplicacion.
    fireEvent.change(screen.getByLabelText('Nombre de la aplicación'), {
      target: { value: 'MINI MARKET PRUEBA' }
    });
    // TEST SISTEMA - EDICION DE CAMPOS:
    // Cambia el logo del sistema usando el campo URL/base64.
    fireEvent.change(screen.getByLabelText('URL del logo'), {
      target: { value: '/imagenes/logo-prueba.png' }
    });
    // TEST SISTEMA - ACCION:
    // Presiona el boton principal del formulario de Personalizacion.
    fireEvent.click(screen.getByRole('button', { name: /guardar personalización/i }));

    // TEST SISTEMA - VALIDACION:
    // Comprueba que el frontend envio al backend los datos modificados en "personalizacion".
    await waitFor(() => {
      expect(mockedSaveConfiguracionSistema).toHaveBeenCalledWith(expect.objectContaining({
        personalizacion: expect.objectContaining({
          appName: 'MINI MARKET PRUEBA',
          logo: '/imagenes/logo-prueba.png'
        })
      }));
    });
  });

  // ============================================================
  // TEST BOLETA / COMPROBANTE
  // ============================================================
  // Objetivo:
  // - Simula que el administrador cambia los datos del comprobante.
  // - Verifica que se envie al backend la configuracion "boleta".
  // Campos probados:
  // - Titulo boleta (empresa)
  // - RUC
  // - Telefono
  // - Serie
  // - Direccion
  // - URL logo boleta
  // Botones probados:
  // - Abrir boleta
  // - Guardar boleta
  it('guarda la configuración de boleta cuando cambia los datos del comprobante', async () => {
    // TEST BOLETA - RESPUESTA MOCK:
    // Define lo que responderia el backend despues de guardar los datos del comprobante.
    mockedSaveConfiguracionSistema.mockResolvedValue({
      personalizacion: null,
      boleta: {
        nombre: 'COMERCIAL PRUEBA',
        ruc: '20123456789',
        direccion: 'Av. Prueba 123',
        telefono: '987654321',
        serie: '002',
        logo: '/imagenes/boleta-prueba.png'
      },
      vueltos: null
    });

    // TEST BOLETA - RENDER:
    // Abre la pantalla como administrador para poder acceder al panel de Boleta.
    await renderAsAdmin();

    // TEST BOLETA - NAVEGACION:
    // Cambia desde Personalizacion hacia el formulario de Boleta.
    fireEvent.click(screen.getByRole('button', { name: /abrir boleta/i }));
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia el nombre de empresa que aparecera en el comprobante.
    fireEvent.change(screen.getByLabelText('Título boleta (empresa)'), {
      target: { value: 'COMERCIAL PRUEBA' }
    });
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia el RUC del comprobante.
    fireEvent.change(screen.getByLabelText('RUC'), {
      target: { value: '20123456789' }
    });
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia el telefono impreso en la boleta.
    fireEvent.change(screen.getByLabelText('Teléfono'), {
      target: { value: '987654321' }
    });
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia la serie del comprobante.
    fireEvent.change(screen.getByLabelText('Serie'), {
      target: { value: '002' }
    });
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia la direccion de la empresa.
    fireEvent.change(screen.getByLabelText('Dirección'), {
      target: { value: 'Av. Prueba 123' }
    });
    // TEST BOLETA - EDICION DE CAMPOS:
    // Cambia el logo del comprobante usando el campo URL/base64.
    fireEvent.change(screen.getByLabelText('URL logo boleta'), {
      target: { value: '/imagenes/boleta-prueba.png' }
    });
    // TEST BOLETA - ACCION:
    // Presiona el boton principal del formulario de Boleta.
    fireEvent.click(screen.getByRole('button', { name: /guardar boleta/i }));

    // TEST BOLETA - VALIDACION:
    // Comprueba que el frontend envio al backend todos los campos modificados en "boleta".
    await waitFor(() => {
      expect(mockedSaveConfiguracionSistema).toHaveBeenCalledWith(expect.objectContaining({
        boleta: expect.objectContaining({
          nombre: 'COMERCIAL PRUEBA',
          ruc: '20123456789',
          direccion: 'Av. Prueba 123',
          telefono: '987654321',
          serie: '002',
          logo: '/imagenes/boleta-prueba.png'
        })
      }));
    });
  });
  it('guarda el monto base para vueltos', async () => {
    mockedSaveConfiguracionSistema.mockResolvedValue({
      personalizacion: null,
      boleta: null,
      vueltos: { montoBase: 150 }
    });

    await renderAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /abrir vueltos/i }));
    fireEvent.change(screen.getByLabelText('Monto base para vueltos'), {
      target: { value: '150' }
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar vueltos/i }));

    await waitFor(() => {
      expect(mockedSaveConfiguracionSistema).toHaveBeenCalledWith(expect.objectContaining({
        vueltos: expect.objectContaining({ montoBase: 150 })
      }));
    });
  });
});