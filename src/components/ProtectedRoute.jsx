import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api.config';
import AppLoader from './AppLoader';

/**
 * ProtectedRoute Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user has valid session
        const response = await axios.get(`${API_BASE}/api/user/profile`, {
          withCredentials: true
        });
        
        if (response.data && response.data.user_id) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // 401 Unauthorized or any error means not authenticated
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    // Redirect to login and save the attempted URL
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
