// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 
                (import.meta.env.MODE === 'production' 
                  ? window.location.origin 
                  : 'http://localhost:4000');

export const API_BASE = API_URL;

export { API_URL };
