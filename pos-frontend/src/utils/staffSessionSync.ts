export const AUTH_LOGOUT_EVENT_KEY = 'auth_logout_event';
export const AUTH_BROADCAST_CHANNEL = 'ecomarket-auth';
export const AUTH_SESSION_CHANGED_EVENT = 'auth-session-changed';

const isProtectedStaffRoute = () => window.location.pathname.startsWith('/dashboard');

const isJsdom = () => /jsdom/i.test(window.navigator.userAgent || '');

export const forceStaffLoginRedirect = () => {
  if (!isProtectedStaffRoute()) return;

  if (!isJsdom()) {
    window.location.replace('/login');
    return;
  }

  window.history.replaceState(null, '', '/login');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const notifyStaffLogout = () => {
  localStorage.setItem(AUTH_LOGOUT_EVENT_KEY, String(Date.now()));
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage({ type: 'logout' });
    channel.close();
  }
};

export const clearStaffSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const shouldForceStaffLogout = () => isProtectedStaffRoute() && !localStorage.getItem('token');

let installed = false;
let intervalId: number | undefined;

export const installStaffSessionSync = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const sync = () => {
    if (shouldForceStaffLogout()) {
      clearStaffSession();
      forceStaffLoginRedirect();
    }
  };

  window.addEventListener('storage', (event) => {
    if (['token', 'user', AUTH_LOGOUT_EVENT_KEY].includes(event.key || '')) sync();
  });
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, sync);

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') sync();
    };
  }

  intervalId = window.setInterval(sync, 500);
  sync();
};

export const uninstallStaffSessionSyncForTests = () => {
  if (intervalId !== undefined) window.clearInterval(intervalId);
  intervalId = undefined;
  installed = false;
};
