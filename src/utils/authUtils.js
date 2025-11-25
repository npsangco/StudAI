/**
 * Authentication Utilities
 * Handles token management and URL-based authentication
 */

/**
 * Check and extract authentication token from URL parameters
 * Used for OAuth redirects and email verification
 * @returns {string|null} - The token if found, null otherwise
 */
export function extractTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    console.log('🎫 Extracting token from URL:', token.substring(0, 20) + '...');
    // Store token in localStorage
    localStorage.setItem('authToken', token);
    console.log('✅ Token stored in localStorage');
    
    // Clean up URL by removing token parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    
    return token;
  }
  
  console.log('ℹ️ No token found in URL');
  return null;
}

/**
 * Check if user is authenticated via either session or token
 * @returns {boolean} - True if authenticated
 */
export function isAuthenticated() {
  // Check if user data exists in localStorage
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('authToken');
  
  return !!(user && token);
}

/**
 * Get stored authentication token
 * @returns {string|null} - The token if exists
 */
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Clear all authentication data
 */
export function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // Legacy token storage
}

/**
 * Store user data
 * @param {object} userData - User data to store
 */
export function setUserData(userData) {
  localStorage.setItem('user', JSON.stringify(userData));
}

/**
 * Get stored user data
 * @returns {object|null} - User data if exists
 */
export function getUserData() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

export default {
  extractTokenFromURL,
  isAuthenticated,
  getAuthToken,
  clearAuth,
  setUserData,
  getUserData,
};
