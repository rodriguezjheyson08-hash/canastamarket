import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import Header from '../../components/layout/Header';
import { useAuth } from '../../contexts/AuthContext';
import { getPedidosOnline } from '../../services/api';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../services/api', () => ({
  getPedidosOnline: jest.fn()
}));

jest.mock('../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({
    appName: 'ECOMARKET - LA CANASTA'
  })
}));

jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (spanishText: string) => spanishText
  })
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetPedidosOnline = getPedidosOnline as jest.MockedFunction<typeof getPedidosOnline>;

describe('Header notifications', () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    mockedGetPedidosOnline.mockResolvedValue([]);
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      user: {
        id: 1,
        nombreUsuario: 'admin',
        nombreCompleto: 'Administrador',
        rol: 'ADMINISTRADOR',
        permisos: {
          pedidosOnline: true
        }
      } as any
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: originalNotification
    });
  });

  test('solicita permiso nativo con una interaccion del navegador', async () => {
    const requestPermission = jest.fn().mockResolvedValue('granted');
    const NotificationMock = jest.fn();
    Object.defineProperty(NotificationMock, 'permission', {
      configurable: true,
      get: () => 'default'
    });
    Object.defineProperty(NotificationMock, 'requestPermission', {
      configurable: true,
      value: requestPermission
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: NotificationMock
    });

    render(<Header />);
    fireEvent.pointerDown(window);

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });
  });
});
