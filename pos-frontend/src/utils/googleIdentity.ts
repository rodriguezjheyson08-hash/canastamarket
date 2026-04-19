const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

const GOOGLE_BUTTON_OPTIONS: GoogleGsiButtonConfiguration = {
  type: 'standard',
  theme: 'outline',
  size: 'large',
  text: 'continue_with',
  shape: 'rectangular',
  width: 360
};

let googleScriptPromise: Promise<void> | null = null;

export const loadGoogleGsiScript = (): Promise<void> => {
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GSI_SRC}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Sign-In')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      'load',
      () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      },
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Google Sign-In')), { once: true });
    document.head.appendChild(script);
  }).catch(error => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
};

type RenderGoogleSignInButtonParams = {
  clientId: string;
  container: HTMLDivElement;
  onCredential: (credential?: string) => void | Promise<void>;
};

export const renderGoogleSignInButton = async ({
  clientId,
  container,
  onCredential
}: RenderGoogleSignInButtonParams): Promise<void> => {
  await loadGoogleGsiScript();

  const googleIdentity = window.google?.accounts?.id;
  if (!googleIdentity) {
    throw new Error('Google Sign-In no está disponible.');
  }

  googleIdentity.initialize({
    client_id: clientId,
    callback: response => {
      void onCredential(response?.credential);
    }
  });

  container.innerHTML = '';
  googleIdentity.renderButton(container, GOOGLE_BUTTON_OPTIONS);
};
