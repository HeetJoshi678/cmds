import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]); // array of { id, message, type }

  // Expose a playul toast notifier
  const addToast = (message, type = 'announcement') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically close after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Establish WebSocket Connection with Express backend server (routed via Vite proxy)
    const socket = io(window.location.origin);

    socket.on('connect', () => {
      // Register this socket to user and role specific rooms
      socket.emit('join', { userId: user.loginId, role: user.role });
    });

    socket.on('new_notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      addToast(notification.message, notification.type);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markNotificationAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to update notification state:', err.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        markNotificationAsRead,
        refetch: fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
