const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeApiUrl = (rawUrl: string) => {
  const value = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!value) return value;
  return value.endsWith('/api') ? value : `${value}/api`;
};

const canUseWindowLocation = () =>
  typeof window !== 'undefined' && Boolean(window.location?.hostname);

const buildWindowApiUrl = () => {
  if (!canUseWindowLocation()) return '';
  const protocol = window.location.protocol || 'http:';
  return normalizeApiUrl(`${protocol}//${window.location.hostname}:8083`);
};

export const resolveApiUrl = () => {
  const configuredUrl = normalizeApiUrl(process.env.REACT_APP_API_URL || '');
  if (!configuredUrl) {
    return buildWindowApiUrl() || normalizeApiUrl('http://localhost:8083');
  }

  if (!canUseWindowLocation()) {
    return configuredUrl;
  }

  try {
    const configured = new URL(configuredUrl);
    const currentHost = String(window.location.hostname || '').trim().toLowerCase();
    const configuredHost = String(configured.hostname || '').trim().toLowerCase();

    if (!LOCAL_HOSTS.has(currentHost) && LOCAL_HOSTS.has(configuredHost)) {
      return buildWindowApiUrl() || configuredUrl;
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl;
};

export const API_URL = resolveApiUrl();
