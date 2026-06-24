import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { useAppConfig } from './useAppConfig';
import { getConfiguracionPublica } from '../services/api';
import { loadAppConfig } from '../utils/appConfig';

jest.mock('../services/api', () => ({
  getConfiguracionPublica: jest.fn()
}));

const mockedGetConfiguracionPublica = getConfiguracionPublica as jest.MockedFunction<typeof getConfiguracionPublica>;

const ConfigProbe = () => {
  const config = useAppConfig();
  return <span>{config.appName}</span>;
};

describe('useAppConfig global', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetConfiguracionPublica.mockResolvedValue({
      personalizacion: {
        appName: 'ECOMARKET GLOBAL',
        idioma: 'es',
        moneda: 'S/',
        logo: '',
        userImg: ''
      }
    });
  });

  test('reemplaza el valor local por el guardado globalmente y lo mantiene', async () => {
    localStorage.setItem('configApp', JSON.stringify({ appName: 'Sistema POS' }));
    render(<ConfigProbe />);

    expect(screen.getByText('Sistema POS')).toBeInTheDocument();
    await screen.findByText('ECOMARKET GLOBAL');
    await waitFor(() => expect(mockedGetConfiguracionPublica).toHaveBeenCalled());
    expect(loadAppConfig().appName).toBe('ECOMARKET GLOBAL');
    expect(document.title).toBe('ECOMARKET GLOBAL');
  });
});
