import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogIn,
  Play,
  Edit3,
  Pause,
  Send,
  AlertTriangle,
  Eye,
  Clock,
  Monitor,
  MousePointer,
  Shield,
  MessageSquare,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

interface TimelineEvent {
  id: string;
  time: string;
  type:
    | "login"
    | "exam_start"
    | "answer"
    | "pause"
    | "submit"
    | "anomaly"
    | "tab_switch"
    | "focus_change"
    | "mouse_pattern";
  description: string;
  severity?: "normal" | "warning" | "critical";
  detail?: string;
}

interface IntegrityNote {
  id: string;
  question: number;
  note: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
}

const mockEvents: TimelineEvent[] = [
  {
    id: "1",
    time: "09:00:00",
    type: "login",
    description: "Student logged in from IP 192.168.1.45",
    severity: "normal",
  },
  {
    id: "2",
    time: "09:01:12",
    type: "exam_start",
    description: "Exam session started — fullscreen mode activated",
    severity: "normal",
  },
  {
    id: "3",
    time: "09:03:45",
    type: "answer",
    description: "Answered Question 1 (Option B)",
    severity: "normal",
  },
  {
    id: "4",
    time: "09:05:22",
    type: "answer",
    description: "Answered Question 2 (Option A)",
    severity: "normal",
  },
  {
    id: "5",
    time: "09:07:10",
    type: "tab_switch",
    description: "Tab switch detected — left exam window",
    severity: "warning",
    detail: "Duration: 4.2 seconds",
  },
  {
    id: "6",
    time: "09:07:14",
    type: "focus_change",
    description: "Returned to exam tab",
    severity: "normal",
  },
  {
    id: "7",
    time: "09:08:30",
    type: "answer",
    description: "Answered Question 3 (Option C)",
    severity: "normal",
    detail: "Time spent: 1m 16s",
  },
  {
    id: "8",
    time: "09:10:00",
    type: "mouse_pattern",
    description: "Unusual mouse movement pattern detected",
    severity: "warning",
    detail: "Rapid cursor movement between screen regions",
  },
  {
    id: "9",
    time: "09:12:55",
    type: "answer",
    description: "Answered Question 4 (Option D)",
    severity: "normal",
    detail: "Time spent: 15s — flagged as abnormally fast",
  },
  {
    id: "10",
    time: "09:12:55",
    type: "anomaly",
    description: "Abnormal answer timing detected (Q4: 15s, average: 2m 30s)",
    severity: "critical",
    detail: "Response time 90% below average",
  },
  {
    id: "11",
    time: "09:15:00",
    type: "tab_switch",
    description: "Second tab switch detected",
    severity: "warning",
    detail: "Duration: 7.8 seconds",
  },
  {
    id: "12",
    time: "09:15:08",
    type: "focus_change",
    description: "Returned to exam tab",
    severity: "normal",
  },
  {
    id: "13",
    time: "09:50:00",
    type: "answer",
    description: "Answered Question 5 (Option B)",
    severity: "normal",
  },
  {
    id: "14",
    time: "10:55:00",
    type: "submit",
    description: "Exam submitted — 45/45 answered, 2 flagged",
    severity: "normal",
  },
];

const mockIntegrityNotes: IntegrityNote[] = [
  {
    id: "n1",
    question: 4,
    note: "Response time significantly below average. Pattern matches pre-study answer recall.",
    severity: "warning",
    timestamp: "09:12:55",
  },
  {
    id: "n2",
    question: 5,
    note: "Two tab switches occurred before answering this question.",
    severity: "critical",
    timestamp: "09:15:08",
  },
  {
    id: "n3",
    question: 1,
    note: "Normal response pattern. No anomalies detected.",
    severity: "info",
    timestamp: "09:03:45",
  },
];

export default function ExamEventTimeline() {
  const [selectedTab, setSelectedTab] = useState("events");

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4" />;
      case "exam_start":
        return <Play className="h-4 w-4" />;
      case "answer":
        return <Edit3 className="h-4 w-4" />;
      case "pause":
        return <Pause className="h-4 w-4" />;
      case "submit":
        return <Send className="h-4 w-4" />;
      case "anomaly":
        return <AlertTriangle className="h-4 w-4" />;
      case "tab_switch":
        return <Monitor className="h-4 w-4" />;
      case "focus_change":
        return <Eye className="h-4 w-4" />;
      case "mouse_pattern":
        return <MousePointer className="h-4 w-4" />;
    }
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

  const getDotColor = (type: TimelineEvent["type"], severity?: string) => {
    if (severity === "critical") return "bg-red-500";
    if (severity === "warning") return "bg-yellow-500";
    if (type === "login" || type === "exam_start") return "bg-green-500";
    if (type === "submit") return "bg-blue-500";
    return "bg-primary";
  };

  const anomalyCount = mockEvents.filter(
    (e) => e.severity === "critical" || e.severity === "warning",
  ).length;

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
              Detailed log of events and behaviors during your exam session
            </p>
          </div>
          <StatusBadge
            status={
              anomalyCount > 2 ? "critical" : anomalyCount > 0 ? "warning" : "none"
            }
            domain="severity"
          >
            {anomalyCount} anomalies detected
          </StatusBadge>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-semibold">{mockEvents.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-semibold">
                {mockEvents.filter((e) => e.type === "tab_switch").length}
              </p>
              <p className="text-xs text-muted-foreground">Tab Switches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-semibold text-yellow-600">
                {mockEvents.filter((e) => e.severity === "warning").length}
              </p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-semibold text-red-600">
                {mockEvents.filter((e) => e.severity === "critical").length}
              </p>
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

          {/* Event Log */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Log</CardTitle>
                <CardDescription>
                  Chronological record of all exam session events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-0">
                    {mockEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`relative flex gap-4 p-3 rounded-lg ml-0 border mb-2 ${getSeverityColor(event.severity)}`}
                      >
                        {/* Dot */}
                        <div className="relative z-10 shrink-0">
                          <div
                            className={`h-3 w-3 rounded-full mt-1 ${getDotColor(event.type, event.severity)}`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {getEventIcon(event.type)}
                            <span className="text-xs font-mono text-muted-foreground">
                              {event.time}
                            </span>
                            {event.severity === "warning" && (
                              <StatusBadge status="warning" domain="severity">
                                Warning
                              </StatusBadge>
                            )}
                            {event.severity === "critical" && (
                              <StatusBadge status="critical" domain="severity">
                                Critical
                              </StatusBadge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">
                            {event.description}
                          </p>
                          {event.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomaly Detection */}
          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Anomalous Behavior Detection
                </CardTitle>
                <CardDescription>
                  AI-analyzed behavioral anomalies during the exam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockEvents
                    .filter(
                      (e) =>
                        e.severity === "warning" || e.severity === "critical",
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border ${getSeverityColor(event.severity)}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getEventIcon(event.type)}
                          <span className="font-medium text-sm">
                            {event.type.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground ml-auto">
                            {event.time}
                          </span>
                        </div>
                        <p className="text-sm">{event.description}</p>
                        {event.detail && (
                          <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 rounded px-2 py-1 inline-block">
                            {event.detail}
                          </p>
                        )}
                      </div>
                    ))}

                  {mockEvents.filter(
                    (e) =>
                      e.severity === "warning" || e.severity === "critical",
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No anomalies detected. Your session was clean.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrity Notes */}
          <TabsContent value="integrity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Integrity Notes
                </CardTitle>
                <CardDescription>
                  Per-question integrity assessment notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockIntegrityNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`flex gap-4 p-4 rounded-lg border ${
                        note.severity === "critical"
                          ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                          : note.severity === "warning"
                            ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-semibold text-sm">
                          Q{note.question}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Question {note.question}
                          </span>
                          <StatusBadge
                            status={note.severity}
                            domain="severity"
                            label={note.severity === "info" ? "Clean" : undefined}
                          >
                            {note.severity === "info" ? "Clean" : note.severity}
                          </StatusBadge>
                          <span className="text-xs font-mono text-muted-foreground ml-auto">
                            {note.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {note.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
