import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import api, { unwrapPaginatedData } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  message: string;
  link?: string | null;
  priority?: "low" | "normal" | "high";
  isRead?: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const dashboardPath =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "LECTURER"
        ? "/lecturer"
        : "/student";

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.getMyNotifications({ limit: 100 });
      setNotifications(unwrapPaginatedData<NotificationRow>(response));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markAllRead = async () => {
    await api.markAllNotificationsAsRead();
    await loadNotifications();
  };

  const markRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    await loadNotifications();
  };

  const remove = async (id: string) => {
    await api.deleteNotification(id);
    await loadNotifications();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackToDashboardButton to={dashboardPath} className="-ml-2" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              Your latest alerts, reminders, and system updates.
            </p>
          </div>
          <Button onClick={markAllRead} variant="outline" className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Inbox
            </CardTitle>
            <CardDescription>
              All notifications delivered to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm">
                  New exam, course, submission, and account events will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 ${item.isRead ? "border-border bg-background" : "border-primary/20 bg-primary/5"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {item.title}
                          </h3>
                          {!item.isRead && (
                            <Badge variant="secondary">New</Badge>
                          )}
                          {item.priority === "high" && (
                            <Badge variant="destructive">High</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.link && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={item.link}>Open</Link>
                          </Button>
                        )}
                        {!item.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markRead(item.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
