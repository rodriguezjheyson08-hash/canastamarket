/*
 * MAPA DEL ARCHIVO: COMPONENTE FRONTEND
 * UBICACION: pos-frontend/src/components/common/BarcodeScannerDialog.tsx
 * QUE HACE: Componente reutilizable compartido entre pantallas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';

// TIPOS FRONTEND: alias BarcodeScannerDialogProps para ordenar datos internos.
type BarcodeScannerDialogProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onDetected: (code: string) => void;
};

// TIPOS FRONTEND: alias DetectedBarcode para ordenar datos internos.
type DetectedBarcode = {
  rawValue?: string;
};

// TIPOS FRONTEND: alias BarcodeDetectorConstructor para ordenar datos internos.
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const barcodeFormats = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf'
];

const BarcodeScannerDialog: React.FC<BarcodeScannerDialogProps> = ({
  open,
  title = 'Escanear código de barras',
  onClose,
  onDetected
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    detectedRef.current = false;
    setError('');

// LOGICA: stop Camera concentra una operacion de este archivo.
    const stopCamera = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

// LOGICA: start concentra una operacion de este archivo.
    const start = async () => {
      const BarcodeDetectorImpl = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!BarcodeDetectorImpl) {
        setError('Este navegador no soporta escaneo de códigos con cámara. Usa Chrome/Edge actualizado o una lectora que escriba en el campo.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('No se puede acceder a la cámara desde este navegador.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new BarcodeDetectorImpl({ formats: barcodeFormats });
// LOGICA: scan concentra una operacion de este archivo.
        const scan = async () => {
          if (!active || !videoRef.current || detectedRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = results[0]?.rawValue?.trim();
            if (code) {
              detectedRef.current = true;
              onDetected(code);
              onClose();
              return;
            }
          } catch (_error) {
            // Keep scanning; transient frame failures are normal while the camera focuses.
          }
          rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
      } catch (cameraError) {
        setError('No se pudo abrir la cámara. Revisa permisos del navegador o usa HTTPS/localhost.');
      }
    };

    start();

    return () => {
      active = false;
      stopCamera();
    };
  }, [onClose, onDetected, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 1,
                bgcolor: '#111',
                aspectRatio: '4 / 3'
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  top: '42%',
                  height: '16%',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 999px rgba(0,0,0,0.28)'
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Apunta la cámara al código hasta que se detecte automáticamente.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScannerDialog;
