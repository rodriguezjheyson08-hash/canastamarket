import React, { useEffect, useRef } from 'react';
import { Alert, Box } from '@mui/material';

const SCRIPT_ID = 'google-identity-services';

const GoogleSignInButton: React.FC<{ onCredential: (credential: string) => void }> = ({ onCredential }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => response.credential && onCredential(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', logo_alignment: 'left', width: 360, locale: 'es'
      });
    };
    if (window.google?.accounts?.id) render();
    else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID; script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true; document.body.appendChild(script);
      }
      script.addEventListener('load', render);
      return () => { cancelled = true; script?.removeEventListener('load', render); };
    }
    return () => { cancelled = true; };
  }, [clientId, onCredential]);

  if (!clientId) return <Alert severity="info">Configura Google Client ID para habilitar este acceso.</Alert>;
  return <Box ref={containerRef} sx={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
};

export default GoogleSignInButton;
