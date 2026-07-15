"use client";

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp?: Date;
}

interface NotificationPopupProps {
  notifications: NotificationItem[];
  maxNotifications?: number;
  autoCloseDuration?: number; // milliseconds, 0 = no auto-close
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const getIcon = (type?: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'info':
      return <Info className="h-5 w-5 text-blue-600" />;
    default:
      return <Bell className="h-5 w-5 text-blue-600" />;
  }
};

const getTypeColor = (type?: string) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'info':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case 'top-left':
      return 'fixed top-4 left-4';
    case 'bottom-right':
      return 'fixed bottom-4 right-4';
    case 'bottom-left':
      return 'fixed bottom-4 left-4';
    case 'top-right':
    default:
      return 'fixed top-4 right-4';
  }
};

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notifications,
  maxNotifications = 3,
  autoCloseDuration = 5000,
  onClose,
  position = 'top-right',
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sliced = notifications.slice(0, maxNotifications);
    setVisibleNotifications(sliced);
    setClosingIds(new Set());

    if (autoCloseDuration > 0 && sliced.length > 0) {
      const timer = setTimeout(() => {
        // Add fade-out animation
        const firstId = sliced[0].id;
        setClosingIds((prev) => new Set(prev).add(firstId));

        // Remove after animation
        setTimeout(() => {
          setVisibleNotifications((prev) => prev.filter((n) => n.id !== firstId));
          onClose?.();
        }, 300);
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [notifications, maxNotifications, autoCloseDuration, onClose]);

  const handleDismiss = (id: string) => {
    setClosingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`${getPositionClasses(position)} z-50 space-y-2 w-96 max-w-[calc(100vw-2rem)]`}>
      {visibleNotifications.map((notification) => (
        <Card
          key={notification.id}
          className={`border ${getTypeColor(notification.type)} transition-all duration-300 ${
            closingIds.has(notification.id) ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold">{notification.title}</CardTitle>
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {notification.message}
                  </CardDescription>
                  {notification.timestamp && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => handleDismiss(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default NotificationPopup;

