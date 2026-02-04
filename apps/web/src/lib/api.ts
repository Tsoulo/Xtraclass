const apiBaseUrl = import.meta.env.VITE_SERVER_URL || '';

export const buildApiUrl = (path: string) =>
  apiBaseUrl && path.startsWith("/") ? `${apiBaseUrl}${path}` : path;
