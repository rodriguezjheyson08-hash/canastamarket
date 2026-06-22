/*
 * MAPA DEL ARCHIVO: PRUEBA FRONTEND
 * UBICACION: pos-frontend/src/tests/proveedores/07-ProveedoresPage.test.tsx
 * QUE HACE: Prueba la pantalla de proveedores: agregar, editar, eliminar y buscar.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
// TEST FRONTEND - PROVEEDORES:
// Valida que la pantalla llame a los servicios correctos y actualice la tabla.
// TEST FRONTEND - CAMBIOS: aqui se agregan casos cuando cambian acciones de proveedores.
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
// IMPORTACIONES FRONTEND: pagina real, tipos y servicios que se reemplazan con mocks.
import ProveedoresPage from '../../pages/07-ProveedoresPage';
import { Proveedor } from '../../types';
import {
  createProveedor,
  deleteProveedor,
  getProveedores,
  listPedidosCompra,
  updateProveedor
} from '../../services/proveedores';

// MOCK FRONTEND: evita llamar al backend real y permite controlar respuestas de proveedores.
jest.mock('../../services/proveedores', () => ({
  consultarRuc: jest.fn(),
  createProveedor: jest.fn(),
  deletePedidoCompra: jest.fn(),
  deletePedidosCompraByIds: jest.fn(),
  deleteProveedor: jest.fn(),
  downloadPedidoCompraCsv: jest.fn(),
  getProveedores: jest.fn(),
  listPedidosCompra: jest.fn(),
  updateProveedor: jest.fn()
}));

// DATOS TEST: proveedores iniciales que aparecen en la tabla al renderizar la pantalla.
const proveedoresBase: Proveedor[] = [
  {
    id: 1,
    numeroDocumento: '20111111111',
    razonSocial: 'Distribuidora Norte SAC',
    contactoNombre: 'Ana Perez',
    contactoTelefono: '987654321',
    contactoEmail: 'ana@norte.test',
    direccion: 'Av. Lima 123',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    distrito: 'Trujillo',
    provincia: 'Trujillo',
    departamento: 'La Libertad'
  },
  {
    id: 2,
    numeroDocumento: '20222222222',
    razonSocial: 'Abarrotes Andes EIRL',
    contactoNombre: 'Luis Rojas',
    contactoTelefono: '912345678',
    contactoEmail: 'luis@andes.test',
    direccion: 'Jr. Cusco 456',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    distrito: 'Cusco',
    provincia: 'Cusco',
    departamento: 'Cusco'
  }
];

// MOCKS TIPADOS: permiten usar mockResolvedValue y verificar llamadas con TypeScript.
const mockedGetProveedores = getProveedores as jest.MockedFunction<typeof getProveedores>;
const mockedCreateProveedor = createProveedor as jest.MockedFunction<typeof createProveedor>;
const mockedUpdateProveedor = updateProveedor as jest.MockedFunction<typeof updateProveedor>;
const mockedDeleteProveedor = deleteProveedor as jest.MockedFunction<typeof deleteProveedor>;
const mockedListPedidosCompra = listPedidosCompra as jest.MockedFunction<typeof listPedidosCompra>;

// HELPER TEST: renderiza la pagina con proveedores falsos y espera la primera fila.
const renderPage = async (proveedores: Proveedor[] = proveedoresBase) => {
  mockedGetProveedores.mockResolvedValue(proveedores);
  mockedListPedidosCompra.mockResolvedValue([]);

  render(<ProveedoresPage />);

  await screen.findByText('Distribuidora Norte SAC');
};

// HELPER TEST: obtiene la fila de tabla donde esta un proveedor por razon social.
const getProveedorRow = (razonSocial: string) => {
  const text = screen.getByText(razonSocial);
  const row = text.closest('tr');
  if (!row) throw new Error(`No se encontro la fila para ${razonSocial}`);
  return row;
};

// HELPER TEST: escapa texto para usarlo dentro de expresiones regulares.
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// HELPER TEST: cambia el valor de un campo Material UI dentro del dialogo.
const changeField = (container: HTMLElement, label: string, value: string) => {
  const field = within(container)
    .getAllByLabelText(new RegExp(escapeRegExp(label), 'i'))
    .find((element) => ['INPUT', 'TEXTAREA'].includes(element.tagName));

  if (!field) throw new Error(`No se encontro el campo ${label}`);

  fireEvent.change(field, { target: { value } });
};

describe('ProveedoresPage', () => {
  // TEST SETUP: limpia mocks y simula confirmaciones/ventanas antes de cada prueba.
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  // TEST CLEANUP: restaura confirm/open para que no afecten otros archivos de prueba.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TEST AGREGAR: llena el formulario nuevo y comprueba que createProveedor recibe el payload.
  it('agrega un proveedor desde el formulario', async () => {
    const nuevoProveedor: Proveedor = {
      id: 3,
      numeroDocumento: '20333333333',
      razonSocial: 'Lacteos Pacifico SAC',
      contactoNombre: 'Maria Solis',
      contactoTelefono: '999888777',
      contactoEmail: 'maria@pacifico.test',
      direccion: 'Av. Grau 789'
    };
    mockedCreateProveedor.mockResolvedValue(nuevoProveedor);

    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
    const dialog = await screen.findByRole('dialog');

    changeField(dialog, 'RUC', nuevoProveedor.numeroDocumento);
    changeField(dialog, 'Razón social', nuevoProveedor.razonSocial);
    changeField(dialog, 'Contacto', nuevoProveedor.contactoNombre || '');
    changeField(dialog, 'Teléfono', nuevoProveedor.contactoTelefono || '');
    changeField(dialog, 'Email', nuevoProveedor.contactoEmail || '');
    changeField(dialog, 'Dirección', nuevoProveedor.direccion || '');
    fireEvent.click(within(dialog).getByRole('button', { name: /crear/i }));

    await waitFor(() => {
      expect(mockedCreateProveedor).toHaveBeenCalledWith({
        numeroDocumento: '20333333333',
        razonSocial: 'Lacteos Pacifico SAC',
        direccion: 'Av. Grau 789',
        estado: null,
        condicion: null,
        distrito: null,
        provincia: null,
        departamento: null,
        contactoNombre: 'Maria Solis',
        contactoTelefono: '999888777',
        contactoEmail: 'maria@pacifico.test'
      });
    });
    expect(await screen.findByText('Lacteos Pacifico SAC')).toBeInTheDocument();
  });

  // TEST EDITAR: abre el formulario existente y comprueba que updateProveedor usa el id correcto.
  it('edita un proveedor existente', async () => {
    const proveedorEditado: Proveedor = {
      ...proveedoresBase[0],
      razonSocial: 'Distribuidora Norte Actualizada SAC',
      contactoNombre: 'Ana Torres'
    };
    mockedUpdateProveedor.mockResolvedValue(proveedorEditado);

    await renderPage();

    const row = getProveedorRow('Distribuidora Norte SAC');
    fireEvent.click(within(row).getAllByRole('button')[2]);
    const dialog = await screen.findByRole('dialog');

    changeField(dialog, 'Razón social', proveedorEditado.razonSocial);
    changeField(dialog, 'Contacto', proveedorEditado.contactoNombre || '');
    fireEvent.click(within(dialog).getByRole('button', { name: /actualizar/i }));

    await waitFor(() => {
      expect(mockedUpdateProveedor).toHaveBeenCalledWith(1, expect.objectContaining({
        numeroDocumento: '20111111111',
        razonSocial: 'Distribuidora Norte Actualizada SAC',
        contactoNombre: 'Ana Torres'
      }));
    });
    expect(await screen.findByText('Distribuidora Norte Actualizada SAC')).toBeInTheDocument();
  });

  // TEST ELIMINAR: confirma la eliminacion y comprueba que la fila desaparece de la tabla.
  it('elimina un proveedor confirmado por el usuario', async () => {
    mockedDeleteProveedor.mockResolvedValue();

    await renderPage();

    const row = getProveedorRow('Distribuidora Norte SAC');
    fireEvent.click(within(row).getAllByRole('button')[3]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Distribuidora Norte SAC'));
      expect(mockedDeleteProveedor).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Distribuidora Norte SAC')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Abarrotes Andes EIRL')).toBeInTheDocument();
  });

  // TEST BUSCAR: escribe en el buscador y valida que solo quede el proveedor coincidente.
  it('busca proveedores por texto en la tabla', async () => {
    await renderPage();

    fireEvent.change(screen.getByPlaceholderText('Buscar por RUC, razón social, contacto, teléfono o dirección'), {
      target: { value: 'andes' }
    });

    expect(screen.getByText('Abarrotes Andes EIRL')).toBeInTheDocument();
    expect(screen.queryByText('Distribuidora Norte SAC')).not.toBeInTheDocument();
  });

  // TEST CONTACTO: el boton Gmail abre Gmail Web con el correo asociado al proveedor.
  it('abre Gmail con el correo del proveedor como destinatario', async () => {
    await renderPage();

    const row = getProveedorRow('Distribuidora Norte SAC');
    fireEvent.click(within(row).getAllByRole('button')[1]);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://mail.google.com/mail/?'),
      '_blank',
      'noopener,noreferrer,width=900,height=700'
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('to=ana%40norte.test'),
      '_blank',
      'noopener,noreferrer,width=900,height=700'
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('su=Pedido+%2F+consulta+-+Distribuidora+Norte+SAC'),
      '_blank',
      'noopener,noreferrer,width=900,height=700'
    );
  });

  // TEST CONTACTO: el boton WhatsApp normaliza el celular peruano y abre wa.me con mensaje.
  it('abre WhatsApp con el telefono del proveedor y mensaje inicial', async () => {
    await renderPage();

    const row = getProveedorRow('Distribuidora Norte SAC');
    fireEvent.click(within(row).getAllByRole('button')[0]);

    expect(window.open).toHaveBeenCalledWith(
      'https://wa.me/51987654321?text=Hola%20Distribuidora%20Norte%20SAC.',
      '_blank',
      'noopener,noreferrer'
    );
  });

  // TEST CONTACTO: si faltan telefono o correo, los botones quedan deshabilitados.
  it('deshabilita botones de contacto cuando el proveedor no tiene telefono ni correo', async () => {
    await renderPage([
      {
        ...proveedoresBase[0],
        contactoTelefono: '',
        contactoEmail: ''
      }
    ]);

    const row = getProveedorRow('Distribuidora Norte SAC');
    const buttons = within(row).getAllByRole('button');

    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(window.open).not.toHaveBeenCalled();
  });
});
