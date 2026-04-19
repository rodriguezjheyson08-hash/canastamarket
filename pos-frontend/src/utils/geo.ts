export type LatLng = { lat: number; lng: number };

export const parseLatLngFromText = (text: string): LatLng | null => {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

export const parseGoogleMapsLatLng = (text: string): LatLng | null => {
  const raw = String(text || '').trim();
  if (!raw) return null;

  // Soporta que el usuario pegue "lat,lng" sin URL.
  const direct = parseLatLngFromText(raw);
  if (direct) return direct;

  // Patrones típicos de Google Maps.
  // 1) .../@lat,lng,17z
  const at = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/);
  if (at) return parseLatLngFromText(`${at[1]},${at[2]}`);

  // 2) ...?q=lat,lng
  const q = raw.match(/[?&]q=([^&]+)/);
  if (q) {
    const decoded = decodeURIComponent(q[1].replace(/\+/g, ' '));
    const coords = parseLatLngFromText(decoded);
    if (coords) return coords;
  }

  // 3) ...?ll=lat,lng
  const ll = raw.match(/[?&]ll=([^&]+)/);
  if (ll) {
    const decoded = decodeURIComponent(ll[1].replace(/\+/g, ' '));
    const coords = parseLatLngFromText(decoded);
    if (coords) return coords;
  }

  // 4) ...!3dlat!4dlng
  const bang = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bang) return parseLatLngFromText(`${bang[1]},${bang[2]}`);

  return null;
};

export const buildGoogleMapsSearchUrl = (query: string): string => {
  const q = String(query || '').trim();
  const fallback = 'Mi ubicación';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || fallback)}`;
};

export const buildGoogleMapsDirectionsUrl = (origin: LatLng, destination: LatLng): string => {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&travelmode=driving`;
};

export const geocodeAddressGoogle = async (
  address: string,
  apiKey: string
): Promise<null | { location: LatLng; formattedAddress?: string }> => {
  const addr = String(address || '').trim();
  const key = String(apiKey || '').trim();
  if (!addr || !key) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  const first = Array.isArray(data?.results) ? data.results[0] : null;
  const loc = first?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { location: { lat, lng }, formattedAddress: String(first?.formatted_address || '').trim() || undefined };
};
