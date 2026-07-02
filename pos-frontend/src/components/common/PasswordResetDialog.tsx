import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { confirmPasswordReset, requestPasswordReset } from '../../services/api';

type Props = { open: boolean; onClose: () => void; accountType: 'usuario' | 'cliente'; defaultEmail?: string };

const PasswordResetDialog: React.FC<Props> = ({ open, onClose, accountType, defaultEmail = '' }) => {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('request'); setEmail(defaultEmail); setCode(''); setNewPassword(''); setConfirmPassword('');
      setMessage(''); setError('');
    }
  }, [open, defaultEmail]);

  const requestCode = async () => {
    setLoading(true); setError('');
    try {
      const result = await requestPasswordReset(email.trim(), accountType);
      setMessage(result.message); setStep('confirm');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo enviar el código.');
    } finally { setLoading(false); }
  };

  const confirmReset = async () => {
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true); setError('');
    try {
      const result = await confirmPasswordReset(email.trim(), accountType, code, newPassword);
      setMessage(result.message); setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la contraseña.');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Restablecer contraseña</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Correo registrado" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={step === 'confirm'} fullWidth />
          {step === 'confirm' && <>
            <TextField label="Código de 6 dígitos" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric', maxLength: 6 }} fullWidth />
            <TextField label="Nueva contraseña" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Mínimo 8 caracteres, mayúscula, minúscula y número." fullWidth />
            <TextField label="Confirmar contraseña" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
          </>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={loading || !email.trim() || (step === 'confirm' && (code.length !== 6 || !newPassword))} onClick={step === 'request' ? requestCode : confirmReset}>
          {step === 'request' ? 'Enviar código' : 'Actualizar contraseña'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordResetDialog;
