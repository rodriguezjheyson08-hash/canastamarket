import React, { useMemo } from 'react';
import { Alert, Box, Button } from '@mui/material';

type LatLng = { lat: number; lng: number };

const buildLatLng = (p: LatLng) => `${p.lat},${p.lng}`;

const buildDirectionsUrl = (apiKey: string, origin: string, destination: string) => {
  const originValue = encodeURIComponent(origin);
  const destValue = encodeURIComponent(destination);
  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(apiKey)}&origin=${originValue}&destination=${destValue}&mode=driving`;
};

const buildPlaceUrl = (apiKey: string, place: LatLng) => {
  const q = encodeURIComponent(buildLatLng(place));
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}`;
};

const buildPlaceQueryUrl = (apiKey: string, query: string) => {
  const q = encodeURIComponent(query);
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}`;
};

const buildOpenMapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const GoogleMapsEmbed: React.FC<{
  apiKey?: string;
  origin?: LatLng | null;
  destination?: LatLng | null;
  destinationQuery?: string | null;
  height?: number;
}> = ({ apiKey, origin, destination, destinationQuery, height = 420 }) => {
  const safeApiKey = String(apiKey || '').trim();
  const safeDestinationQuery = String(destinationQuery || '').trim();
  const src = useMemo(() => {
    if (!safeApiKey) return '';
    if (origin && destination) return buildDirectionsUrl(safeApiKey, buildLatLng(origin), buildLatLng(destination));
    if (origin && !destination && safeDestinationQuery) {
      return buildDirectionsUrl(safeApiKey, buildLatLng(origin), safeDestinationQuery);
    }
    if (destination) return buildPlaceUrl(safeApiKey, destination);
    if (safeDestinationQuery) return buildPlaceQueryUrl(safeApiKey, safeDestinationQuery);
    return '';
  }, [safeApiKey, origin?.lat, origin?.lng, destination?.lat, destination?.lng, safeDestinationQuery]);

  const openUrl = destination
    ? buildOpenMapsUrl(buildLatLng(destination))
    : safeDestinationQuery
      ? buildOpenMapsUrl(safeDestinationQuery)
      : '';

  if (!destination && !safeDestinationQuery) {
    return <Alert severity="info">No hay ubicación de entrega para mostrar en el mapa.</Alert>;
  }

  if (!safeApiKey) {
    return (
      <Alert severity="warning" action={openUrl ? <Button color="inherit" size="small" onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}>Abrir Maps</Button> : undefined}>
        Falta configurar `REACT_APP_GOOGLE_MAPS_EMBED_API_KEY` para ver el mapa dentro del sistema.
      </Alert>
    );
  }

  if (!src) {
    return <Alert severity="info">Cargando mapa…</Alert>;
  }

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.12)',
        bgcolor: '#fff'
      }}
    >
      <iframe
        title="Mapa"
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        src={src}
      />
    </Box>
  );
};
