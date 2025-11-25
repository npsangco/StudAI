// API Configuration
const resolveApiUrl = () => {
  const envValue = import.meta.env.VITE_API_URL?.trim();

  // In production we always call back to the same origin so cookies stay first-party
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Allow overriding in development (or fallback to the local backend)
  return envValue || 'http://localhost:4000';
};

const API_URL = resolveApiUrl();

export const API_BASE = API_URL;

export { API_URL };
