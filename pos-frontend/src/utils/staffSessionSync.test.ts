import '@testing-library/jest-dom';
import { installStaffSessionSync, uninstallStaffSessionSyncForTests } from './staffSessionSync';

describe('staff session sync global', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    uninstallStaffSessionSyncForTests();
    window.history.pushState(null, '', '/dashboard/ventas');
  });

  afterEach(() => {
    uninstallStaffSessionSyncForTests();
    jest.useRealTimers();
  });

  test('redirige automaticamente a login cuando otra pestana elimina el token', () => {
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({ nombreUsuario: 'ecomarket' }));

    installStaffSessionSync();
    expect(window.location.pathname).toBe('/dashboard/ventas');

    localStorage.removeItem('token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'token' }));

    expect(window.location.pathname).toBe('/login');
  });

  test('redirige por vigilancia periodica aunque no llegue evento storage', () => {
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({ nombreUsuario: 'ecomarket' }));

    installStaffSessionSync();
    localStorage.removeItem('token');

    jest.advanceTimersByTime(500);

    expect(window.location.pathname).toBe('/login');
  });
});
