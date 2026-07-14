import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { getCurrentUser } from '../services/api';

jest.mock('../services/api', () => ({
  getCurrentUser: jest.fn(async () => ({
    id: 1,
    nombreUsuario: 'ecomarket',
    nombreCompleto: 'ECOMARKET',
    rol: 'ADMINISTRADOR',
    permisos: {}
  })),
  login: jest.fn(),
  loginWithGoogle: jest.fn()
}));

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

const AuthStatus = () => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div>
      <span>{isAuthenticated ? 'autenticado' : 'sin-sesion'}</span>
      <span>{user?.nombreUsuario || 'sin-usuario'}</span>
    </div>
  );
};

describe('AuthContext sincronizacion entre pestanas', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      nombreUsuario: 'ecomarket',
      nombreCompleto: 'ECOMARKET',
      rol: 'ADMINISTRADOR',
      permisos: {}
    });
  });

  test('cierra la sesion sin recargar cuando otra pestana emite logout', async () => {
    window.history.pushState(null, '', '/dashboard/ventas');
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      nombreUsuario: 'ecomarket',
      nombreCompleto: 'ECOMARKET',
      rol: 'ADMINISTRADOR',
      permisos: {}
    }));

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );

    expect(await screen.findByText('autenticado')).toBeInTheDocument();
    expect(screen.getByText('ecomarket')).toBeInTheDocument();

    act(() => {
      localStorage.removeItem('token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));
    });

    await waitFor(() => {
      expect(screen.getByText('sin-sesion')).toBeInTheDocument();
      expect(screen.getByText('sin-usuario')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
    });
  });

  test('no reactiva la sesion si auth/me responde despues del logout', async () => {
    let resolveCurrentUser: (value: any) => void = () => {};
    mockedGetCurrentUser.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCurrentUser = resolve;
    }));

    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      nombreUsuario: 'ecomarket',
      nombreCompleto: 'ECOMARKET',
      rol: 'ADMINISTRADOR',
      permisos: {}
    }));

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );

    expect(await screen.findByText('autenticado')).toBeInTheDocument();

    act(() => {
      localStorage.removeItem('token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));
    });

    await waitFor(() => expect(screen.getByText('sin-sesion')).toBeInTheDocument());

    await act(async () => {
      resolveCurrentUser({
        id: 1,
        nombreUsuario: 'ecomarket',
        nombreCompleto: 'ECOMARKET',
        rol: 'ADMINISTRADOR',
        permisos: {}
      });
    });

    expect(screen.getByText('sin-sesion')).toBeInTheDocument();
    expect(screen.getByText('sin-usuario')).toBeInTheDocument();
  });
});
