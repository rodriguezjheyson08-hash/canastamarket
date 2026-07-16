/*
 * MAPA DEL ARCHIVO: LAYOUT FRONTEND
 * UBICACION: pos-frontend/src/components/layout/Header.tsx
 * QUE HACE: Header compartido del sistema interno y monitor de pedidos online.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { AppBar, Avatar, Box, Button, Toolbar, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../common/BackButton';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useI18n } from '../../hooks/useI18n';
import { getPedidosOnline } from '../../services/api';
import { canAccess } from '../../utils/permissions';

export const PEDIDOS_ONLINE_UPDATE_EVENT = 'pedidos-online-update';

interface HeaderProps {
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showBack }) => {
  const { user, logout } = useAuth();
  const config = useAppConfig();
  const { t } = useI18n();
  const lastPedidoIdsRef = useRef<Set<number> | null>(null);

  const isPedidoPendiente = useCallback((pedido: any) => (
    ['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO'].includes(String(pedido.estado || ''))
  ), []);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
      window.setTimeout(() => context.close().catch(() => undefined), 700);
    } catch {
      // Algunos navegadores bloquean sonido hasta que exista interaccion.
    }
  }, []);

  const notifyPedidoOnline = useCallback((cantidad: number) => {
    const titulo = cantidad === 1 ? 'Nuevo pedido online' : `${cantidad} nuevos pedidos online`;
    const mensaje = 'Revisa Pedidos Online para atenderlo.';
    playNotificationSound();
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(titulo, {
          body: mensaje,
          icon: '/logo192.png',
          tag: `pedido-online-${Date.now()}`,
          requireInteraction: true,
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(titulo, {
              body: mensaje,
              icon: '/logo192.png',
              tag: `pedido-online-${Date.now()}`,
              requireInteraction: true,
            });
          }
        }).catch(() => undefined);
      }
    }
  }, [playNotificationSound]);

  useEffect(() => {
    if (!user || !canAccess(user, 'pedidosOnline')) {
      lastPedidoIdsRef.current = null;
      return undefined;
    }

    let active = true;
    const fetchPedidos = async () => {
      try {
        const pedidos = await getPedidosOnline();
        if (!active || !Array.isArray(pedidos)) return;
        const pendientes = pedidos.filter(isPedidoPendiente);
        const currentIds = new Set(pendientes.map((pedido: any) => Number(pedido.id)));
        const previousIds = lastPedidoIdsRef.current;
        if (previousIds) {
          const nuevos = [...currentIds].filter((id) => !previousIds.has(id));
          if (nuevos.length > 0) {
            notifyPedidoOnline(nuevos.length);
            globalThis.dispatchEvent(new Event(PEDIDOS_ONLINE_UPDATE_EVENT));
          }
        }
        lastPedidoIdsRef.current = currentIds;
      } catch {
        if (active) lastPedidoIdsRef.current = null;
      }
    };

    void fetchPedidos();
    const intervalId = window.setInterval(fetchPedidos, 10000);
    globalThis.addEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, fetchPedidos);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      globalThis.removeEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, fetchPedidos);
    };
  }, [isPedidoPendiente, notifyPedidoOnline, user]);

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={2} sx={{ zIndex: 1201 }}>
        <Toolbar>
          {showBack && <BackButton />}
          <StorefrontIcon sx={{ mx: 1, fontSize: 32 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {config.appName}
          </Typography>
          {user && (
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user.nombreCompleto?.charAt(0) || user.nombreUsuario.charAt(0)}
              </Avatar>
              <Box textAlign="right">
                <Typography variant="body2" fontWeight="bold">
                  {user.nombreCompleto || user.nombreUsuario}
                </Typography>
              </Box>
              <Button color="inherit" variant="outlined" size="small" onClick={logout} sx={{ ml: 2 }}>
                {t('Cerrar sesion', 'Log out')}
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
