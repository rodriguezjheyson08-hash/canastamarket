import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PasswordResetDialog from './PasswordResetDialog';
import { completePasswordReset, requestPasswordReset, verifyPasswordResetCode } from '../../services/api';

jest.mock('../../services/api', () => ({
  requestPasswordReset: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
  completePasswordReset: jest.fn()
}));

const requestMock = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>;
const verifyMock = verifyPasswordResetCode as jest.MockedFunction<typeof verifyPasswordResetCode>;
const completeMock = completePasswordReset as jest.MockedFunction<typeof completePasswordReset>;

test('solicita correo, valida el codigo y recien despues muestra la nueva contrasena', async () => {
  requestMock.mockResolvedValue({ message: 'Codigo enviado.' });
  verifyMock.mockResolvedValue({ message: 'Codigo validado.', resetToken: 'reset-token' });
  render(<PasswordResetDialog open onClose={jest.fn()} accountType="usuario" />);

  fireEvent.change(screen.getByLabelText('Correo registrado'), { target: { value: 'caja@test.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar codigo' }));
  expect(await screen.findByLabelText('Codigo de 6 digitos')).toBeInTheDocument();
  expect(screen.queryByLabelText('Nueva contrasena')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Codigo de 6 digitos'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validar codigo' }));
  await waitFor(() => expect(verifyMock).toHaveBeenCalledWith('caja@test.com', 'usuario', '123456'));
  expect(await screen.findByLabelText('Nueva contrasena')).toBeInTheDocument();
});

test('valida contrasena fuerte antes de completar recuperacion', async () => {
  requestMock.mockResolvedValue({ message: 'Codigo enviado.' });
  verifyMock.mockResolvedValue({ message: 'Codigo validado.', resetToken: 'reset-token' });
  completeMock.mockResolvedValue({ message: 'Contrasena actualizada correctamente.' });
  render(<PasswordResetDialog open onClose={jest.fn()} accountType="cliente" />);

  fireEvent.change(screen.getByLabelText('Correo registrado'), { target: { value: 'cliente@test.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar codigo' }));
  fireEvent.change(await screen.findByLabelText('Codigo de 6 digitos'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validar codigo' }));
  await screen.findByLabelText('Nueva contrasena');

  fireEvent.change(screen.getByLabelText('Nueva contrasena'), { target: { value: 'debil' } });
  fireEvent.change(screen.getByLabelText('Confirmar contrasena'), { target: { value: 'debil' } });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar contrasena' }));

  expect(await screen.findByText('La contrasena debe tener 8 caracteres, mayuscula, minuscula y numero.')).toBeInTheDocument();
  expect(completeMock).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Nueva contrasena'), { target: { value: ' NuevaClave123 ' } });
  fireEvent.change(screen.getByLabelText('Confirmar contrasena'), { target: { value: 'NuevaClave123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar contrasena' }));

  await waitFor(() => expect(completeMock).toHaveBeenCalledWith('reset-token', 'NuevaClave123'));
});
