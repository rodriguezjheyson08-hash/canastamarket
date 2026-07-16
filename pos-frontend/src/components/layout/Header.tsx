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
import {
  getPedidosOnline,
  getPedidosOnlinePushPublicKey,
  subscribePedidosOnlinePush
} from '../../services/api';
import { canAccess } from '../../utils/permissions';

export const PEDIDOS_ONLINE_UPDATE_EVENT = 'pedidos-online-update';
export const PEDIDOS_ONLINE_NOTIFY_STORAGE_KEY = 'ecomarket:pedido-online-notify';
export const PEDIDOS_ONLINE_NOTIFY_CHANNEL = 'ecomarket-pedidos-online';
const PEDIDOS_ONLINE_NOTIFICATION_TAG = 'ecomarket-pedido-online';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

interface HeaderProps {
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showBack }) => {
  const { user, logout } = useAuth();
  const config = useAppConfig();
  const { t } = useI18n();
  const lastPedidoIdsRef = useRef<Set<number> | null>(null);
  const notificationAudioRef = useRef<AudioContext | null>(null);
  const pushSubscriptionStartedRef = useRef(false);

  const isPedidoPendiente = useCallback((pedido: any) => (
    ['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO'].includes(String(pedido.estado || ''))
  ), []);

  const getNotificationAudio = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return null;
      if (!notificationAudioRef.current || notificationAudioRef.current.state === 'closed') {
        notificationAudioRef.current = new AudioContextCtor();
      }
      return notificationAudioRef.current;
    } catch {
      return null;
    }
  }, []);

  const primeNotificationAudio = useCallback(() => {
    const context = getNotificationAudio();
    if (!context) return;
    void context.resume().then(() => {
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.03);
      } catch {
        // Solo intenta desbloquear el audio del navegador.
      }
    }).catch(() => undefined);
  }, [getNotificationAudio]);

  const playNotificationSound = useCallback(() => {
    try {
      const context = getNotificationAudio();
      if (!context) return;
      if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }
      const master = context.createGain();
      master.gain.value = 1;
      master.connect(context.destination);

      [783.99, 987.77, 1318.51, 987.77].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.16;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(1, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.44);
      });
    } catch {
      // Algunos navegadores bloquean sonido hasta que exista interaccion.
    }
  }, [getNotificationAudio]);

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

  const ensurePedidoPushSubscription = useCallback(async () => {
    if (pushSubscriptionStartedRef.current) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    pushSubscriptionStartedRef.current = true;
    try {
      const registration = await getNotificationRegistration();
      if (!registration?.pushManager) return;
      const publicKey = await getPedidosOnlinePushPublicKey();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await subscribePedidosOnlinePush(subscription);
    } catch {
      pushSubscriptionStartedRef.current = false;
    }
  }, [getNotificationRegistration]);

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
      icon: '/images/logo512.png',
      badge: '/images/logo192.png',
      tag: PEDIDOS_ONLINE_NOTIFICATION_TAG,
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
      data: { url: '/dashboard/pedidos-online' } as any,
    };

    try {
      const registration = await getNotificationRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(titulo, options);
      }
    } catch {
      // Si el navegador bloquea el service worker, se intenta la notificacion directa.
    }

    try {
      const notification = new Notification(titulo, options);
      notification.onclick = () => {
        window.focus();
        window.location.assign('/dashboard/pedidos-online');
      };
    } catch {
      // Si el navegador bloquea las notificaciones nativas, no se puede forzar desde codigo.
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
      primeNotificationAudio();
      void requestNativeNotificationPermission().then(() => ensurePedidoPushSubscription());
    };
    void ensurePedidoPushSubscription();
    window.addEventListener('pointerdown', askPermissionOnInteraction, { once: true });
    window.addEventListener('keydown', askPermissionOnInteraction, { once: true });
    const intervalId = window.setInterval(fetchPedidos, 2500);
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
  }, [
    ensurePedidoPushSubscription,
    getNotificationRegistration,
    isPedidoPendiente,
    notifyPedidoOnline,
    primeNotificationAudio,
    requestNativeNotificationPermission,
    user
  ]);

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
