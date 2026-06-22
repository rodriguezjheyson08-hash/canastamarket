/*
 * MAPA DEL ARCHIVO: TIPOS GLOBALES FRONTEND
 * UBICACION: pos-frontend/src/types/google-identity-services.d.ts
 * QUE HACE: Declaraciones TypeScript compartidas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
export {};

declare global {
  interface GoogleCredentialResponse {
    credential?: string;
    select_by?: string;
    clientId?: string;
  }

// TIPOS FRONTEND: props/datos GoogleIdConfiguration usados por este componente.
  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }

// TIPOS FRONTEND: props/datos GoogleButtonConfiguration usados por este componente.
  interface GoogleButtonConfiguration {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number | string;
    locale?: string;
  }

// TIPOS FRONTEND: props/datos Window usados por este componente.
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
          cancel: () => void;
        };
      };
    };
  }
}
