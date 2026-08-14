/** Optional GPS payload sent with face punch (multipart form fields). */
export type PunchLocation = {
  location?: string;
  latitude?: number;
  longitude?: number;
};

const parseCoord = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

export const parsePunchLocation = (body: unknown): PunchLocation => {
  const b = (body ?? {}) as Record<string, unknown>;
  const latitude = parseCoord(b.latitude ?? b.lat);
  const longitude = parseCoord(b.longitude ?? b.lng ?? b.lon);
  const rawLabel =
    typeof b.location === 'string'
      ? b.location.trim()
      : typeof b.address === 'string'
        ? b.address.trim()
        : '';

  let location = rawLabel || undefined;
  if (!location && latitude != null && longitude != null) {
    location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  return { location, latitude, longitude };
};
