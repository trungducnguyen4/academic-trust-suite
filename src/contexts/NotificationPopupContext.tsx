"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NotificationItem } from '@/components/common/NotificationPopup';

interface NotificationPopupContextType {
  showNotifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationPopupContext = createContext<NotificationPopupContextType | undefined>(undefined);

export function NotificationPopupProvider({ children }: { children: ReactNode }) {
  const [showNotifications, setShowNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const id = `${Math.random()}-${Date.now()}`;
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: notification.timestamp || new Date(),
    };

    setShowNotifications((prev) => {
      // Keep only the most recent 10 notifications to prevent memory leak
      const updated = [newNotification, ...prev];
      return updated.slice(0, 10);
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setShowNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setShowNotifications([]);
  }, []);

  return (
    <NotificationPopupContext.Provider
      value={{
        showNotifications,
        addNotification,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationPopupContext.Provider>
  );
}

export function useNotificationPopup() {
  const context = useContext(NotificationPopupContext);
  if (!context) {
    throw new Error('useNotificationPopup must be used within NotificationPopupProvider');
  }
  return context;
}

