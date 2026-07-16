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
export const PEDIDOS_ONLINE_NOTIFY_STORAGE_KEY = 'ecomarket:pedido-online-notify';
export const PEDIDOS_ONLINE_NOTIFY_CHANNEL = 'ecomarket-pedidos-online';

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
      const master = context.createGain();
      master.gain.value = 0.55;
      master.connect(context.destination);

      [880, 1174.66, 880, 1318.51].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.12;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.65, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
      });

      window.setTimeout(() => context.close().catch(() => undefined), 1300);
    } catch {
      // Algunos navegadores bloquean sonido hasta que exista interaccion.
    }
  }, []);

  const getNotificationRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      await navigator.serviceWorker.register('/pedido-notifications-sw.js');
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }, []);

  const requestNativeNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    try {
      await Notification.requestPermission();
    } catch {
      // El navegador puede bloquear el prompt si no hubo interaccion real.
    }
  }, []);

  const showNativeNotification = useCallback(async (titulo: string, mensaje: string) => {
    if (!('Notification' in window)) return;

    let permission = Notification.permission;
    if (permission === 'default' && document.hasFocus()) {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = Notification.permission;
      }
    }
    if (permission !== 'granted') return;

    const options: NotificationOptions = {
      body: mensaje,
      icon: '/images/logo192.png',
      badge: '/images/logo192.png',
      tag: `pedido-online-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url: '/dashboard/pedidos-online' } as any,
    };

    try {
      const notification = new Notification(titulo, options);
      notification.onclick = () => {
        window.focus();
        window.location.assign('/dashboard/pedidos-online');
      };
      return;
    } catch {
      const registration = await getNotificationRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(titulo, options);
      }
    }
  }, [getNotificationRegistration]);

  const notifyPedidoOnline = useCallback((cantidad: number) => {
    const titulo = cantidad === 1 ? 'Nuevo pedido online' : `${cantidad} nuevos pedidos online`;
    const mensaje = 'Revisa Pedidos Online para atenderlo.';
    playNotificationSound();
    void showNativeNotification(titulo, mensaje);
  }, [playNotificationSound, showNativeNotification]);

  useEffect(() => {
    if (!user || !canAccess(user, 'pedidosOnline')) {
      lastPedidoIdsRef.current = null;
      return undefined;
    }

    let active = true;
    const fetchPedidos = async (suppressNotify = false) => {
      try {
        const pedidos = await getPedidosOnline();
        if (!active || !Array.isArray(pedidos)) return;
        const pendientes = pedidos.filter(isPedidoPendiente);
        const currentIds = new Set(pendientes.map((pedido: any) => Number(pedido.id)));
        const previousIds = lastPedidoIdsRef.current;
        if (previousIds) {
          const nuevos = [...currentIds].filter((id) => !previousIds.has(id));
          if (!suppressNotify && nuevos.length > 0) {
            notifyPedidoOnline(nuevos.length);
            globalThis.dispatchEvent(new Event(PEDIDOS_ONLINE_UPDATE_EVENT));
          }
        }
        lastPedidoIdsRef.current = currentIds;
      } catch {
        if (active) lastPedidoIdsRef.current = null;
      }
    };

    const notifyFromExternalTab = () => {
      if (!active) return;
      notifyPedidoOnline(1);
      void fetchPedidos(true);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PEDIDOS_ONLINE_NOTIFY_STORAGE_KEY && event.newValue) {
        notifyFromExternalTab();
      }
    };

    const channel = 'BroadcastChannel' in window
      ? new BroadcastChannel(PEDIDOS_ONLINE_NOTIFY_CHANNEL)
      : null;
    if (channel) {
      channel.onmessage = notifyFromExternalTab;
    }

    const handlePedidosUpdate = () => {
      void fetchPedidos(true);
    };

    void fetchPedidos();
    void getNotificationRegistration();
    const askPermissionOnInteraction = () => {
      void requestNativeNotificationPermission();
    };
    if ('Notification' in window && Notification.permission === 'default') {
      window.addEventListener('pointerdown', askPermissionOnInteraction, { once: true });
      window.addEventListener('keydown', askPermissionOnInteraction, { once: true });
    }
    const intervalId = window.setInterval(fetchPedidos, 10000);
    globalThis.addEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, handlePedidosUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      globalThis.removeEventListener(PEDIDOS_ONLINE_UPDATE_EVENT, handlePedidosUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pointerdown', askPermissionOnInteraction);
      window.removeEventListener('keydown', askPermissionOnInteraction);
      channel?.close();
    };
  }, [getNotificationRegistration, isPedidoPendiente, notifyPedidoOnline, requestNativeNotificationPermission, user]);

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
