import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PasswordResetDialog from './PasswordResetDialog';
import { requestPasswordReset, verifyPasswordResetCode } from '../../services/api';

jest.mock('../../services/api', () => ({
  requestPasswordReset: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
  completePasswordReset: jest.fn()
}));

const requestMock = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>;
const verifyMock = verifyPasswordResetCode as jest.MockedFunction<typeof verifyPasswordResetCode>;

test('solicita correo, valida el código y recién después muestra la nueva contraseña', async () => {
  requestMock.mockResolvedValue({ message: 'Código enviado.' });
  verifyMock.mockResolvedValue({ message: 'Código validado.', resetToken: 'reset-token' });
  render(<PasswordResetDialog open onClose={jest.fn()} accountType="usuario" />);

  fireEvent.change(screen.getByLabelText('Correo registrado'), { target: { value: 'caja@test.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
  expect(await screen.findByLabelText('Código de 6 dígitos')).toBeInTheDocument();
  expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validar código' }));
  await waitFor(() => expect(verifyMock).toHaveBeenCalledWith('caja@test.com', 'usuario', '123456'));
  expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument();
});
