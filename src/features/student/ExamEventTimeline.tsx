"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Clock,
  Edit3,
  Eye,
  Loader2,
  Monitor,
  MousePointer,
  Play,
  Send,
  Shield,
} from "lucide-react";

type TimelineEvent = {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  severity: "normal" | "warning" | "critical";
  detail?: string;
};

type TimelinePayload = {
  submission: {
    id: string;
    status: string;
    exam?: { title?: string };
  };
  summary: {
    totalEvents: number;
    tabSwitches: number;
    mouseAnomalies: number;
    warnings: number;
    critical: number;
  };
  events: TimelineEvent[];
  integrityNotes: Array<{
    id: string;
    note: string;
    severity: "warning" | "critical";
    timestamp: string;
    detail?: string;
  }>;
};

export default function ExamEventTimeline() {
  const [selectedTab, setSelectedTab] = useState("events");
  const [payload, setPayload] = useState<TimelinePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let submissionId =
          localStorage.getItem("currentSubmissionId") ||
          localStorage.getItem("lastSubmissionId") ||
          "";

        if (!submissionId) {
          const submissions: any = await api.getMySubmissions();
          const rows = Array.isArray(submissions) ? submissions : submissions?.data || [];
          submissionId = rows[0]?.id || "";
        }

        if (!submissionId) {
          if (active) setPayload(null);
          return;
        }

        const data = await api.getSubmissionTimeline(submissionId);
        if (active) setPayload(data);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load timeline");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => payload?.events || [], [payload?.events]);
  const anomalyCount = (payload?.summary.warnings || 0) + (payload?.summary.critical || 0);
  const anomalyEvents = useMemo(
    () => events.filter((event) => event.severity === "warning" || event.severity === "critical"),
    [events],
  );

  const getEventIcon = (type: string) => {
    if (type.includes("tab")) return <Monitor className="h-4 w-4" />;
    if (type.includes("mouse")) return <MousePointer className="h-4 w-4" />;
    if (type.includes("focus") || type.includes("blur")) return <Eye className="h-4 w-4" />;
    if (type.includes("answer")) return <Edit3 className="h-4 w-4" />;
    if (type.includes("submit")) return <Send className="h-4 w-4" />;
    if (type.includes("start")) return <Play className="h-4 w-4" />;
    if (type.includes("violation") || type.includes("fullscreen")) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20";
      case "warning":
        return "border-yellow-300 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20";
      default:
        return "border-border bg-card";
    }
  };

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(value));

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <BackToDashboardButton to="/student" className="mb-4 -ml-2" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Exam Event Timeline
            </h1>
            <p className="text-muted-foreground">
              Read-only timeline reconstructed from stored integrity logs.
            </p>
          </div>
          <StatusBadge status={anomalyCount > 2 ? "critical" : anomalyCount > 0 ? "warning" : "none"} domain="severity">
            {anomalyCount} anomalies detected
          </StatusBadge>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              Loading real exam timeline...
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card className="border-red-200">
            <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && !payload && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              No exam session timeline found yet.
            </CardContent>
          </Card>
        )}

        {!loading && !error && payload && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold">{payload.summary.totalEvents}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold">{payload.summary.tabSwitches}</p>
                  <p className="text-xs text-muted-foreground">Tab Switches</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-yellow-600">{payload.summary.warnings}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-semibold text-red-600">{payload.summary.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical Flags</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="events">Event Log</TabsTrigger>
                <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
                <TabsTrigger value="integrity">Integrity Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{payload.submission.exam?.title || "Exam Session"}</CardTitle>
                    <CardDescription>Chronological record from backend integrity logs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-0">
                        {events.map((event) => (
                          <div key={event.id} className={`relative flex gap-4 p-3 rounded-lg border mb-2 ${getSeverityColor(event.severity)}`}>
                            <div className="relative z-10 shrink-0">
                              <div className={`h-3 w-3 rounded-full mt-1 ${event.severity === "critical" ? "bg-red-500" : event.severity === "warning" ? "bg-yellow-500" : "bg-primary"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {getEventIcon(event.type)}
                                <span className="text-xs font-mono text-muted-foreground">{formatTime(event.timestamp)}</span>
                                {event.severity !== "normal" && (
                                  <StatusBadge status={event.severity} domain="severity">
                                    {event.severity}
                                  </StatusBadge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{event.description}</p>
                              {event.detail && <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="anomalies">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Suspicious Signals
                    </CardTitle>
                    <CardDescription>Signals for review only. This screen does not conclude cheating.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {anomalyEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No suspicious signals recorded.</p>
                      </div>
                    ) : (
                      anomalyEvents.map((event) => (
                        <div key={event.id} className={`p-4 rounded-lg border ${getSeverityColor(event.severity)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {getEventIcon(event.type)}
                            <span className="font-medium text-sm">{event.type.replace(/_/g, " ").toUpperCase()}</span>
                            <span className="text-xs font-mono text-muted-foreground ml-auto">{formatTime(event.timestamp)}</span>
                          </div>
                          <p className="text-sm">{event.description}</p>
                          {event.detail && <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 rounded px-2 py-1 inline-block">{event.detail}</p>}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrity">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Integrity Notes</CardTitle>
                    <CardDescription>Generated from recorded warning and critical events</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {payload.integrityNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No integrity notes for this session.</div>
                    ) : (
                      payload.integrityNotes.map((note) => (
                        <div key={note.id} className={`p-4 rounded-lg border ${getSeverityColor(note.severity)}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={note.severity} domain="severity">
                              {note.severity}
                            </StatusBadge>
                            <span className="text-xs font-mono text-muted-foreground ml-auto">{formatTime(note.timestamp)}</span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                          {note.detail && <p className="text-xs text-muted-foreground mt-1">{note.detail}</p>}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
