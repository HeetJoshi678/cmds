import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Set default authorization header for axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error('Session validation failed. Logging out...', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (loginId, password, role) => {
    try {
      const res = await axios.post('/api/auth/login', { loginId, password, role });
      const { token: userToken, user: userData } = res.data;
      
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || (err.message === 'Network Error' ? 'Cannot connect to backend server. Please verify backend is running on port 5000.' : err.message) || 'Login failed. Please try again.';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const updateUserProfile = (updatedUserData) => {
    setUser(prev => ({
      ...prev,
      ...updatedUserData
    }));
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUserProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
