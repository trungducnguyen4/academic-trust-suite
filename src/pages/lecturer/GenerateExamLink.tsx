import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Link2,
  Copy,
  CheckCircle2,
  Loader2,
  QrCode,
  Trash2,
  Clock,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import api, { unwrapPaginatedData } from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

interface ExamItem {
  id: string;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: string;
  course?: { code?: string; name?: string };
}

interface ExamLinkItem {
  id: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  lastUsedAt: string | null;
  restrictedToCourse: boolean;
  disabled: boolean;
  note?: string | null;
  createdAt: string;
  createdBy?: { fullName?: string; email?: string };
  hasPassword?: boolean;
}

interface LinkUsage {
  id: string;
  ip?: string;
  userAgent?: string;
  usedAt: string;
  user?: { fullName?: string; email?: string; studentId?: string };
}

export default function GenerateExamLink() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [links, setLinks] = useState<ExamLinkItem[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [usage, setUsage] = useState<LinkUsage[]>([]);

  const [expiryDatetime, setExpiryDatetime] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [password, setPassword] = useState("");
  const [restrictedToCourse, setRestrictedToCourse] = useState(false);
  const [note, setNote] = useState("");

  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState("");
  const [newlyCreatedQr, setNewlyCreatedQr] = useState("");
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId),
    [exams, selectedExamId],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const examsRes = await api.getExams();
        const examItems = unwrapPaginatedData(examsRes) as ExamItem[];
        setExams(examItems);

        if (examItems.length > 0) {
          const firstExamId = examItems[0].id;
          setSelectedExamId(firstExamId);
        }
      } catch (error) {
        console.error("Failed to load exams for link generation:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const loadLinks = async () => {
      if (!selectedExamId) {
        setLinks([]);
        return;
      }

      try {
        const res = await api.getExamLinks(selectedExamId);
        setLinks(res || []);
      } catch (error) {
        console.error("Failed to load exam links:", error);
      }
    };

    loadLinks();
  }, [selectedExamId]);

  useEffect(() => {
    const loadUsage = async () => {
      if (!selectedLinkId) {
        setUsage([]);
        return;
      }

      setLoadingUsage(true);
      try {
        const res = await api.getExamLinkUsage(selectedLinkId);
        setUsage(res || []);
      } catch (error) {
        console.error("Failed to load usage logs:", error);
      } finally {
        setLoadingUsage(false);
      }
    };

    loadUsage();
  }, [selectedLinkId]);

  const handleGenerate = async () => {
    if (!selectedExamId) return;

    setCreating(true);
    try {
      const payload: any = {
        restrictedToCourse,
      };

      if (expiryDatetime)
        payload.expiryDatetime = new Date(expiryDatetime).toISOString();
      if (maxUses) payload.maxUses = Number(maxUses);
      if (password.trim()) payload.password = password.trim();
      if (note.trim()) payload.note = note.trim();

      const created = await api.generateExamLink(selectedExamId, payload);
      setNewlyCreatedUrl(created.url);
      setNewlyCreatedQr(created.qrDataUrl || "");

      const updatedLinks = await api.getExamLinks(selectedExamId);
      setLinks(updatedLinks || []);

      setPassword("");
      setNote("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate exam link");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleRevoke = async (linkId: string) => {
    setRevokingId(linkId);
    try {
      await api.updateExamLink(linkId, { disabled: true });
      const updatedLinks = await api.getExamLinks(selectedExamId);
      setLinks(updatedLinks || []);
      if (selectedLinkId === linkId) {
        setUsage([]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to revoke link");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <BackToDashboardButton to="/lecturer" className="-ml-2" />

        <div>
          <h1 className="text-2xl font-semibold">
            Generate Shareable Exam Link
          </h1>
          <p className="text-muted-foreground mt-1">
            Create secure join links with expiry, max uses, optional password,
            and access tracking.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Link Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exam</Label>
                <Select
                  value={selectedExamId}
                  onValueChange={setSelectedExamId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}{" "}
                        {exam.course?.code ? `(${exam.course.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiry Datetime (optional)</Label>
                <Input
                  type="datetime-local"
                  value={expiryDatetime}
                  onChange={(e) => setExpiryDatetime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Uses (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Leave empty for unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Password (optional)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Internal note for this link"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={restrictedToCourse}
                onChange={(e) => setRestrictedToCourse(e.target.checked)}
              />
              Restrict link to enrolled students in this course
            </label>

            {selectedExam && (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                <p>
                  Exam window:{" "}
                  {selectedExam.startTime
                    ? new Date(selectedExam.startTime).toLocaleString()
                    : "Not set"}
                  {" - "}
                  {selectedExam.endTime
                    ? new Date(selectedExam.endTime).toLocaleString()
                    : "Not set"}
                </p>
                <p>Status: {selectedExam.status || "DRAFT"}</p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={creating || !selectedExamId}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Generate Link
            </Button>

            {newlyCreatedUrl && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Latest generated URL</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(newlyCreatedUrl)}
                    className="gap-1"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-sm break-all text-muted-foreground">
                  {newlyCreatedUrl}
                </p>
                {newlyCreatedQr && (
                  <div className="inline-flex flex-col items-center gap-2">
                    <img
                      src={newlyCreatedQr}
                      alt="QR"
                      className="h-36 w-36 rounded border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Share QR for quick join
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exam Links</CardTitle>
            <CardDescription>Revoke links and inspect usage</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No links created for this exam yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((link) => {
                    const isExpired =
                      !!link.expiresAt &&
                      new Date(link.expiresAt).getTime() <= Date.now();
                    const maxReached =
                      link.maxUses != null && link.usedCount >= link.maxUses;
                    const state = link.disabled
                      ? "disabled"
                      : isExpired || maxReached
                        ? "expired"
                        : "active";

                    return (
                      <TableRow key={link.id}>
                        <TableCell className="text-sm">
                          {new Date(link.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {link.expiresAt
                            ? new Date(link.expiresAt).toLocaleString()
                            : "No expiry"}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{link.usedCount}</span>
                          <span className="text-muted-foreground">
                            /{link.maxUses ?? "∞"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {link.hasPassword && (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                            {link.restrictedToCourse && (
                              <Users className="h-3.5 w-3.5" />
                            )}
                            {link.expiresAt && (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              state === "active"
                                ? "success"
                                : state === "disabled"
                                  ? "destructive"
                                  : "default"
                            }
                          >
                            {state}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLinkId(link.id)}
                            >
                              Usage
                            </Button>
                            {!link.disabled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleRevoke(link.id)}
                                disabled={revokingId === link.id}
                              >
                                {revokingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Audit</CardTitle>
            <CardDescription>
              {selectedLinkId
                ? `Latest access logs for link ${selectedLinkId}`
                : "Select a link to view usage history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsage ? (
              <div className="h-28 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No usage records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usage.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {new Date(item.usedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.user?.fullName || item.user?.email || "Unknown"}
                        </TableCell>
                        <TableCell>{item.user?.studentId || "-"}</TableCell>
                        <TableCell>{item.ip || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
