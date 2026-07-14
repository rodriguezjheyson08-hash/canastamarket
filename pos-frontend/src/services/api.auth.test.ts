import '@testing-library/jest-dom';

let mockResponseErrorHandler: ((error: any) => Promise<never>) | undefined;

jest.mock('axios', () => ({
  interceptors: {
    response: {
      use: jest.fn((_onSuccess, onError) => {
        mockResponseErrorHandler = onError;
      })
    }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

describe('api auth interceptor', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    window.history.pushState(null, '', '/dashboard/ventas');
    mockResponseErrorHandler = undefined;
  });

  test('cierra sesion y redirige a login cuando el backend responde 401', async () => {
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({ nombreUsuario: 'ecomarket' }));

    await import('./api');

    await expect(mockResponseErrorHandler?.({ response: { status: 401 } })).rejects.toMatchObject({
      response: { status: 401 }
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.pathname).toBe('/login');
  });
});
