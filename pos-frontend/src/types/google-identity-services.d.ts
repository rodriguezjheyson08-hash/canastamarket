export {};

declare global {
  interface GoogleCredentialResponse {
    credential?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }

  interface GoogleGsiButtonConfiguration {
    type?: string;
    theme?: string;
    size?: string;
    text?: string;
    shape?: string;
    width?: number;
    [key: string]: unknown;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options?: GoogleGsiButtonConfiguration) => void;
          prompt: () => void;
        };
      };
    };
  }
}
