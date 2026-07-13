import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { completePasswordReset, requestPasswordReset, verifyPasswordResetCode } from '../../services/api';

type Props = { open: boolean; onClose: () => void; accountType: 'usuario' | 'cliente'; defaultEmail?: string };

const PASSWORD_MESSAGE = 'La contrasena debe tener 8 caracteres, mayuscula, minuscula y numero.';
const isStrongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(value);

const PasswordResetDialog: React.FC<Props> = ({ open, onClose, accountType, defaultEmail = '' }) => {
  const [step, setStep] = useState<'request' | 'verify' | 'password'>('request');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('request');
      setEmail(defaultEmail);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setMessage('');
      setError('');
    }
  }, [open, defaultEmail]);

  const requestCode = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await requestPasswordReset(email.trim(), accountType);
      setMessage(result.message);
      setStep('verify');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo enviar el codigo.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await verifyPasswordResetCode(email.trim(), accountType, code);
      setResetToken(result.resetToken);
      setMessage(result.message);
      setStep('password');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'El codigo no es valido.');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    const password = newPassword.trim();
    if (password !== confirmPassword.trim()) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError(PASSWORD_MESSAGE);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await completePasswordReset(resetToken, password);
      setMessage(result.message);
      setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la contrasena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Restablecer contrasena</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Correo registrado" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={step !== 'request'} fullWidth />
          {step === 'verify' && (
            <>
              <TextField label="Codigo de 6 digitos" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric', maxLength: 6 }} fullWidth />
              <Alert severity="info">Primero validaremos el codigo. La nueva contrasena se solicitara despues.</Alert>
            </>
          )}
          {step === 'password' && (
            <>
              <TextField label="Nueva contrasena" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Minimo 8 caracteres, mayuscula, minuscula y numero." fullWidth />
              <TextField label="Confirmar contrasena" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={loading || !email.trim() || (step === 'verify' && code.length !== 6) || (step === 'password' && !newPassword.trim())}
          onClick={step === 'request' ? requestCode : step === 'verify' ? verifyCode : confirmReset}
        >
          {step === 'request' ? 'Enviar codigo' : step === 'verify' ? 'Validar codigo' : 'Actualizar contrasena'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordResetDialog;
