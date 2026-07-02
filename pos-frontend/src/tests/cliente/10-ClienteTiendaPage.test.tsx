/*
 * Pruebas unitarias del catalogo publico y del carrito del cliente.
 * Los servicios se simulan para no depender del backend ni de una base de datos.
 */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClienteTiendaPage from '../../pages/10-ClienteTiendaPage';
import { getCategorias, getProductos } from '../../services/api';
import { Categoria, Producto } from '../../types';

jest.mock('../../services/api', () => ({
  createPedidoOnlinePublic: jest.fn(),
  createPublicMercadoPagoPreference: jest.fn(),
  getCategorias: jest.fn(),
  getPedidosOnlinePublic: jest.fn(),
  getProductos: jest.fn()
}));

jest.mock('../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({ appName: 'MiniMarket' })
}));

const mockedGetProductos = getProductos as jest.MockedFunction<typeof getProductos>;
const mockedGetCategorias = getCategorias as jest.MockedFunction<typeof getCategorias>;

const categorias: Categoria[] = [
  { id: 1, nombre: 'Bebidas' },
  { id: 2, nombre: 'Abarrotes' }
];

const productos: Producto[] = [
  {
    id: 1,
    nombre: 'Leche fresca',
    descripcion: 'Leche entera de un litro',
    precioVenta: 4.5,
    stockActual: 3,
    categoriaId: 1,
    activo: true
  },
  {
    id: 2,
    nombre: 'Arroz superior',
    descripcion: 'Bolsa de arroz de un kilo',
    precioVenta: 6,
    stockActual: 8,
    categoriaId: 2,
    activo: true
  },
  {
    id: 3,
    nombre: 'Producto agotado',
    descripcion: 'No debe mostrarse',
    precioVenta: 2,
    stockActual: 0,
    categoriaId: 2,
    activo: true
  },
  {
    id: 4,
    nombre: 'Producto inactivo',
    descripcion: 'No debe mostrarse',
    precioVenta: 3,
    stockActual: 5,
    categoriaId: 2,
    activo: false
  }
];

const renderPage = async () => {
  mockedGetProductos.mockResolvedValue(productos);
  mockedGetCategorias.mockResolvedValue(categorias);
  render(<ClienteTiendaPage />);
  await screen.findByText('Leche fresca');
};

const getProductCard = (productName: string) => {
  const card = screen.getByText(productName).closest('.MuiCard-root');
  if (!card) throw new Error(`No se encontro la tarjeta de ${productName}`);
  return card as HTMLElement;
};

const getCartPanel = () => {
  const panel = screen.getByRole('heading', { name: 'Carrito' }).closest('.MuiPaper-root');
  if (!panel) throw new Error('No se encontro el panel del carrito');
  return panel as HTMLElement;
};

describe('ClienteTiendaPage - catalogo y carrito', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('muestra solo los productos activos con stock y sus datos comerciales', async () => {
    await renderPage();

    expect(mockedGetProductos).toHaveBeenCalledWith(null);
    expect(mockedGetCategorias).toHaveBeenCalledWith(null);

    const lecheCard = getProductCard('Leche fresca');
    expect(within(lecheCard).getByText('Leche entera de un litro')).toBeInTheDocument();
    expect(within(lecheCard).getByText('Bebidas')).toBeInTheDocument();
    expect(within(lecheCard).getByText('S/ 4.50')).toBeInTheDocument();
    expect(within(lecheCard).getByText('Stock 3')).toBeInTheDocument();

    expect(screen.getByText('Arroz superior')).toBeInTheDocument();
    expect(screen.queryByText('Producto agotado')).not.toBeInTheDocument();
    expect(screen.queryByText('Producto inactivo')).not.toBeInTheDocument();
  });

  it('filtra el catalogo por texto y muestra el estado vacio sin coincidencias', async () => {
    await renderPage();

    const search = screen.getByPlaceholderText('Buscar productos');
    fireEvent.change(search, { target: { value: 'arroz' } });

    expect(screen.getByText('Arroz superior')).toBeInTheDocument();
    expect(screen.queryByText('Leche fresca')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'producto inexistente' } });
    expect(screen.getByText('No hay productos disponibles para mostrar.')).toBeInTheDocument();
  });

  it('agrega productos, actualiza cantidades y calcula el total del carrito', async () => {
    await renderPage();

    const addMilk = within(getProductCard('Leche fresca')).getByRole('button', {
      name: 'Agregar al carrito'
    });
    fireEvent.click(addMilk);
    fireEvent.click(addMilk);

    const cart = getCartPanel();
    expect(within(cart).getByText('Leche fresca')).toBeInTheDocument();
    expect(within(cart).getByText('2')).toBeInTheDocument();
    expect(within(cart).getAllByText('S/ 9.00')).toHaveLength(2);

    fireEvent.click(within(cart).getByRole('button', { name: 'Disminuir cantidad de Leche fresca' }));
    expect(within(cart).getByText('1')).toBeInTheDocument();
    expect(within(cart).getAllByText('S/ 4.50')).toHaveLength(2);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('cliente_tienda_carrito') || '{}')).toEqual({ 1: 1 });
    });
  });

  it('respeta el stock maximo y permite eliminar un producto del carrito', async () => {
    await renderPage();

    const addMilk = within(getProductCard('Leche fresca')).getByRole('button', {
      name: 'Agregar al carrito'
    });
    fireEvent.click(addMilk);
    fireEvent.click(addMilk);
    fireEvent.click(addMilk);

    expect(addMilk).toBeDisabled();

    const cart = getCartPanel();
    expect(within(cart).getByText('3')).toBeInTheDocument();
    fireEvent.click(within(cart).getByRole('button', { name: 'Eliminar Leche fresca del carrito' }));

    expect(within(cart).getByText('Tu carrito esta vacio.')).toBeInTheDocument();
    expect(within(cart).getByRole('button', { name: 'Continuar compra' })).toBeDisabled();
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('cliente_tienda_carrito') || '{}')).toEqual({});
    });
  });
});
