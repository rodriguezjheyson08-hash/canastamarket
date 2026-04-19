import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  Badge
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { getPedidos } from '../../services/pedidos';
import { getRepartidorDashboard } from '../../services/reparto';
import { useAuth } from '../../contexts/AuthContext';
import { useClienteAuth } from '../../contexts/ClienteAuthContext';
import { getPedidosCliente } from '../../services/clientes';
import { Venta } from '../../types';

const img = (name: string) => `${process.env.PUBLIC_URL}/images/${name}`;
const IMG_GMAIL = img('logoGmail.png');
const IMG_HELP = img('ayuda.jpg');

const ImageIcon: React.FC<{ src: string; alt: string; size?: number; disabled?: boolean }> = ({
  src,
  alt,
  size = 26,
  disabled
}) => (
  <Box
    component="img"
    src={src}
    alt={alt}
    sx={{
      width: size,
      height: size,
      objectFit: 'contain',
      filter: disabled ? 'grayscale(1) opacity(0.5)' : 'none'
    }}
  />
);

const ActionButton: React.FC<{
  title: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, disabled, children }) => (
  <Tooltip title={title}>
    <span>
      <IconButton size="medium" onClick={onClick} disabled={disabled}>
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ bgcolor: '#ffffff' }}>
    <Container maxWidth="xl" sx={{ py: 1 }}>
      {children}
    </Container>
  </Box>
);

const openGmailInbox = () => {
  window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer');
};

export const WorkerContactActionBar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;
  const isRepartidor = String(user?.rol || '').toUpperCase() === 'REPARTIDOR';
  const workerMainPath = isRepartidor ? '/dashboard/reparto' : '/dashboard/pedidos';
  const [pendientes, setPendientes] = useState(0);
  const [helpAnchor, setHelpAnchor] = useState<null | HTMLElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!userId && isRepartidor) return;
    if (!user && !isRepartidor) return;

    let cancelled = false;
    const load = async () => {
      try {
        let next = 0;
        if (isRepartidor && userId) {
          const data = await getRepartidorDashboard(userId);
          next = Number(data?.stats?.activos || 0);
        } else {
          const data = await getPedidos('pendiente');
          next = Array.isArray(data) ? data.length : 0;
        }
        if (!cancelled) setPendientes(next);
      } catch {
        if (!cancelled) setPendientes(0);
      }
    };
    void load();
    const id = globalThis.setInterval(() => {
      void load();
    }, 15000);
    return () => {
      cancelled = true;
      globalThis.clearInterval(id);
    };
  }, [isRepartidor, user, userId]);

  const closeHelpMenu = () => setHelpAnchor(null);

  return (
    <Wrapper>
      <Box
        sx={{
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.5
        }}
      >
        <ActionButton
          title={t('Ayuda', 'Help')}
          onClick={(e) => setHelpAnchor(e.currentTarget)}
        >
          <ImageIcon src={IMG_HELP} alt="Ayuda" />
        </ActionButton>

        <ActionButton
          title={t('Correo', 'Email')}
          onClick={() => {
            openGmailInbox();
          }}
        >
          <ImageIcon src={IMG_GMAIL} alt="Correo" />
        </ActionButton>

        <Tooltip title={isRepartidor ? t('Notificaciones / Reparto', 'Notifications / Delivery') : t('Notificaciones / Pedidos', 'Notifications / Orders')}>
          <IconButton size="medium" onClick={() => navigate(workerMainPath)}>
            <Badge color="error" badgeContent={pendientes} max={99}>
              <NotificationsIcon sx={{ fontSize: 26 }} />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={helpAnchor}
        open={Boolean(helpAnchor)}
        onClose={closeHelpMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            setHelpOpen(true);
          }}
        >
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Guía rápida', 'Quick guide')} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            navigate(workerMainPath);
          }}
        >
          <ListItemIcon>
            <NotificationsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={isRepartidor ? t('Ver reparto', 'View delivery') : t('Ver pedidos', 'View orders')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            navigate('/dashboard/configuracion');
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Configuración', 'Settings')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            openGmailInbox();
          }}
        >
          <ListItemIcon>
            <Box component="img" src={IMG_GMAIL} alt="Gmail" sx={{ width: 18, height: 18, objectFit: 'contain' }} />
          </ListItemIcon>
          <ListItemText primary={t('Abrir correo', 'Open email')} />
        </MenuItem>
      </Menu>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('Ayuda', 'Help')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {t('Atajos en la barra blanca:', 'Shortcuts in the white bar:')}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <ImageIcon src={IMG_GMAIL} alt="Correo" size={20} />
              <Typography variant="body2">{t('Abre tu Gmail (bandeja).', 'Opens your Gmail inbox.')}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <NotificationsIcon fontSize="small" />
              <Typography variant="body2">
                {t('Te lleva a Pedidos. El número es la cantidad pendiente.', 'Takes you to Orders. The number is pending orders.')}
              </Typography>
            </Box>
            <Divider />
            <Typography variant="body2" fontWeight={900}>
              {t('Acciones comunes', 'Common actions')}
            </Typography>
            <Typography variant="body2">1) {t('Revisa pedidos pendientes.', 'Check pending orders.')}</Typography>
            <Typography variant="body2">2) {t('Actualiza el estado (creando / en camino / entregado).', 'Update status (preparing / on the way / delivered).')}</Typography>
            <Typography variant="body2">3) {t('En Configuración puedes ajustar delivery y contactos.', 'In Settings you can adjust delivery and contacts.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>{t('Cerrar', 'Close')}</Button>
        </DialogActions>
      </Dialog>
    </Wrapper>
  );
};

export const ClienteContactActionBar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { cliente } = useClienteAuth();
  const clienteId = cliente?.id ?? null;
  const [notifs, setNotifs] = useState(0);
  const [helpAnchor, setHelpAnchor] = useState<null | HTMLElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!clienteId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await getPedidosCliente(clienteId);
        const list = Array.isArray(data) ? data : [];
        const active = list.filter((pedido: Venta) => {
          const estado = String(pedido.pedidoEstado || '').toLowerCase();
          return estado !== 'entregado' && estado !== 'rechazado';
        });
        if (!cancelled) setNotifs(active.length);
      } catch {
        if (!cancelled) setNotifs(0);
      }
    };
    void load();
    const id = globalThis.setInterval(() => {
      void load();
    }, 20000);
    return () => {
      cancelled = true;
      globalThis.clearInterval(id);
    };
  }, [clienteId]);

  const closeHelpMenu = () => setHelpAnchor(null);

  return (
    <Wrapper>
      <Box
        sx={{
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.5
        }}
      >
        <ActionButton title={t('Ayuda', 'Help')} onClick={(e) => setHelpAnchor(e.currentTarget)}>
          <ImageIcon src={IMG_HELP} alt="Ayuda" />
        </ActionButton>

        <ActionButton
          title={t('Correo', 'Email')}
          onClick={() => {
            openGmailInbox();
          }}
        >
          <ImageIcon src={IMG_GMAIL} alt="Correo" />
        </ActionButton>

        <Tooltip title={t('Notificaciones / Mis pedidos', 'Notifications / My orders')}>
          <IconButton size="medium" onClick={() => navigate('/perfil')}>
            <Badge color="error" badgeContent={notifs} max={99}>
              <NotificationsIcon sx={{ fontSize: 26 }} />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={helpAnchor}
        open={Boolean(helpAnchor)}
        onClose={closeHelpMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            setHelpOpen(true);
          }}
        >
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Guía rápida', 'Quick guide')} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            navigate('/tienda');
          }}
        >
          <ListItemIcon>
            <StorefrontIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Ir a productos', 'Go to products')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            navigate('/checkout');
          }}
        >
          <ListItemIcon>
            <ShoppingCartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Ir al carrito', 'Go to cart')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            navigate('/perfil');
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('Mi perfil', 'My profile')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeHelpMenu();
            openGmailInbox();
          }}
        >
          <ListItemIcon>
            <Box component="img" src={IMG_GMAIL} alt="Gmail" sx={{ width: 18, height: 18, objectFit: 'contain' }} />
          </ListItemIcon>
          <ListItemText primary={t('Abrir correo', 'Open email')} />
        </MenuItem>
      </Menu>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('Ayuda', 'Help')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={900}>
              {t('Cómo comprar', 'How to buy')}
            </Typography>
            <Typography variant="body2">1) {t('Elige productos y agrégalos al carrito.', 'Pick products and add them to the cart.')}</Typography>
            <Typography variant="body2">2) {t('En Carrito elige delivery o recojo.', 'In Cart choose delivery or pick up.')}</Typography>
            <Typography variant="body2">3) {t('Si eliges delivery, guarda tu dirección en Perfil.', 'If delivery, save your address in Profile.')}</Typography>
            <Typography variant="body2">4) {t('Presiona “Pagar”.', 'Press “Pay”.')}</Typography>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              {t('El ícono de campana muestra tus pedidos activos.', 'The bell shows your active orders.')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>{t('Cerrar', 'Close')}</Button>
        </DialogActions>
      </Dialog>
    </Wrapper>
  );
};
