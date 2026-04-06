import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import api, { unwrapPaginatedData } from "@/lib/api";

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  message: string;
  link?: string | null;
  priority?: "low" | "normal" | "high";
  isRead?: boolean;
  createdAt?: string;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const [notificationResponse, unreadResponse] = await Promise.all([
        api.getMyNotifications({ limit: 8 }),
        api.getUnreadNotificationCount(),
      ]);

      setNotifications(unwrapPaginatedData<NotificationItem>(notificationResponse));
      setUnreadCount(unreadResponse?.count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    if (!isAuthenticated) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const markAsRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    await refresh();
  };

  const markAllAsRead = async () => {
    await api.markAllNotificationsAsRead();
    await refresh();
  };

  const removeNotification = async (id: string) => {
    await api.deleteNotification(id);
    await refresh();
  };

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [notifications, unreadCount, loading],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}
