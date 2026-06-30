"use client";

import { Suspense } from "react";
import NotificationsPage from "@/features/Notifications";

export const dynamic = "force-dynamic";

export default function NotificationsRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationsPage />
    </Suspense>
  );
}

