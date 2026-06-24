import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '../../pages/02-LoginPage';
import { useAuth } from '../../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({ appName: 'CANASTA MARKET', logo: '' })
}));

jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (spanishText: string) => spanishText })
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const login = jest.fn();

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login,
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      user: null
    });
  });

  test('valida campos obligatorios antes de llamar al backend', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(screen.getByText('Rellena todos los campos.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test('envia usuario y contrasena y navega al dashboard', async () => {
    login.mockResolvedValue({ ok: true, user: { nombreUsuario: 'admin', nombreCompleto: 'Administrador', rol: 'ADMINISTRADOR' } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Usuario o correo'), { target: { value: ' admin ' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ nombreUsuario: 'admin', password: 'Clave123' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  test('muestra el error devuelto por autenticacion', async () => {
    login.mockResolvedValue({ ok: false, message: 'Credenciales inválidas' });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Usuario o correo'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
