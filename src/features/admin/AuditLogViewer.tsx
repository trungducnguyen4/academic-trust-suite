"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { AlertTriangle, FileText, Info, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";

type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ip?: string | null;
  severity: "info" | "warning" | "critical";
  status: string;
  details: string;
  source?: string;
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async (page = pagination.page) => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.getAuditLogs({
        page,
        limit: pagination.limit,
        search,
        severity,
      });
      setLogs(payload?.data || []);
      setStats(payload?.stats || null);
      setPagination(payload?.pagination || { page, limit: pagination.limit, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadLogs(1), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, severity]);

  const severityIcon = (value: string) => {
    if (value === "critical") return <ShieldAlert className="h-4 w-4 text-red-600" />;
    if (value === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <Info className="h-4 w-4 text-blue-600" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Audit Log Viewer</h1>
            <p className="text-muted-foreground">
              Read-only audit stream backed by durable EventStore records.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => loadLogs()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-semibold">{stats?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-semibold text-blue-600">{stats?.info || 0}</p><p className="text-xs text-muted-foreground">Info</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-semibold text-yellow-600">{stats?.warning || 0}</p><p className="text-xs text-muted-foreground">Warning</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-semibold text-red-600">{stats?.critical || 0}</p><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Audit Events</CardTitle>
            <CardDescription>Only persisted events are shown. Empty means no critical events have been written yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search user, action, resource, details..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                Loading audit logs...
              </div>
            )}

            {!loading && error && <div className="py-8 text-center text-red-600">{error}</div>}

            {!loading && !error && logs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No audit logs found.
              </div>
            )}

            {!loading && !error && logs.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead className="w-28">Severity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{new Date(log.timestamp).toLocaleString("vi-VN")}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{log.user}</div>
                          <div className="text-xs text-muted-foreground">{log.role}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        <TableCell className="text-xs">{log.resource}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {severityIcon(log.severity)}
                            <StatusBadge status={log.severity === "info" ? "none" : log.severity} domain="severity">
                              {log.severity}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-xs line-clamp-2">{log.details}</p>
                          {log.source && <p className="text-[10px] text-muted-foreground mt-1">source: {log.source}</p>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total} event(s)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => loadLogs(pagination.page + 1)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
