"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

import NotificationPopup from "@/components/common/NotificationPopup";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationPopupProvider, useNotificationPopup } from "@/contexts/NotificationPopupContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const createQueryClient = () => new QueryClient();

function NotificationPopupContainer() {
  const { showNotifications } = useNotificationPopup();
  return <NotificationPopup notifications={showNotifications} position="top-right" />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <NotificationPopupProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NotificationPopupContainer />
              {children}
            </TooltipProvider>
          </NotificationPopupProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
