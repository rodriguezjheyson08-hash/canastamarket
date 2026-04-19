import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';

type LatLng = { lat: number; lng: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const samePoint = (a?: LatLng | null, b?: LatLng | null) => {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
};

const normalizePoints = (points: LatLng[]) =>
  points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

export const LiveLeafletMap: React.FC<{
  current?: LatLng | null;
  path?: LatLng[];
  destination?: LatLng | null;
  height?: number;
  selectable?: boolean;
  onSelect?: (point: LatLng) => void;
}> = ({ current, path = [], destination, height = 520, selectable = false, onSelect }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);
  const lastTargetRef = useRef<LatLng | null>(null);
  const [ready, setReady] = useState(false);
  const [leafletError, setLeafletError] = useState('');

  const safePath = useMemo(() => normalizePoints(path), [path]);

  const boundsPoints = useMemo(() => {
    const list: LatLng[] = [];
    if (safePath.length) list.push(...safePath);
    if (current) list.push(current);
    if (destination) list.push(destination);
    return list;
  }, [safePath, current, destination]);

  const fitToBounds = () => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (boundsPoints.length === 0) return;

    const latLngs = boundsPoints.map((p) => L.latLng(p.lat, p.lng));
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds.pad(0.2));
  };

  const buildDotIcon = (color: string) => {
    const L = window.L;
    if (!L) return undefined;
    return L.divIcon({
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.25)"></div>`
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      for (let i = 0; i < 50; i += 1) {
        if (window.L) break;
        await sleep(100);
      }
      if (cancelled) return;
      const L = window.L;
      if (!L) {
        if (!cancelled) setLeafletError('No se pudo cargar el mapa. Revisa tu conexión o recarga la página.');
        return;
      }
      if (mapRef.current) return;

      const initial: LatLng = current || destination || safePath[safePath.length - 1] || { lat: -8.11599, lng: -79.02998 };

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([initial.lat, initial.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;

      polylineRef.current = L.polyline([], { color: '#1976d2', weight: 4, opacity: 0.85 }).addTo(map);

      if (current) {
        markerRef.current = L.marker([current.lat, current.lng], { icon: buildDotIcon('#1976d2') }).addTo(map);
      }
      if (destination) {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: buildDotIcon('#d32f2f') }).addTo(map);
      }

      if (selectable) {
        map.on('click', (evt: any) => {
          if (!evt?.latlng) return;
          const lat = Number(evt.latlng.lat);
          const lng = Number(evt.latlng.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          onSelect?.({ lat, lng });
        });
      }

      setReady(true);
      fitToBounds();
    })();

    return () => {
      cancelled = true;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      destMarkerRef.current = null;
      polylineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    // Ruta
    const latLngs = safePath.length
      ? safePath.map((p) => [p.lat, p.lng])
      : current && destination
        ? [[current.lat, current.lng], [destination.lat, destination.lng]]
        : [];
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    }

    // Destino
    if (destination) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: buildDotIcon('#d32f2f') }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      }
    }

    // Marcador en vivo (animado)
    if (!current) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([current.lat, current.lng], { icon: buildDotIcon('#1976d2') }).addTo(map);
      lastTargetRef.current = current;
      return;
    }

    const prev = lastTargetRef.current;
    if (samePoint(prev, current)) return;
    lastTargetRef.current = current;

    const marker = markerRef.current;
    const fromLL = marker.getLatLng();
    const from: LatLng = { lat: Number(fromLL.lat), lng: Number(fromLL.lng) };
    const to: LatLng = current;

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const durationMs = 900;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeInOut
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const lat = from.lat + (to.lat - from.lat) * eased;
      const lng = from.lng + (to.lng - from.lng) * eased;
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(step);
  }, [ready, safePath, current, destination]);

  const hasAny = Boolean(current || destination || safePath.length > 0 || selectable);

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.12)',
        bgcolor: '#fff',
        position: 'relative'
      }}
    >
      {!hasAny && <Alert severity="info">Aún no hay ubicación para mostrar.</Alert>}
      {leafletError && <Alert severity="warning" sx={{ mb: 1 }}>{leafletError}</Alert>}
      <Box ref={containerRef} sx={{ width: '100%', height }} />
      {!leafletError && !ready && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            bgcolor: 'rgba(255,255,255,0.6)'
          }}
        >
          <Alert severity="info">Cargando mapa…</Alert>
        </Box>
      )}
      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<MyLocationIcon />}
          onClick={fitToBounds}
        >
          Centrar
        </Button>
      </Box>
    </Box>
  );
};
