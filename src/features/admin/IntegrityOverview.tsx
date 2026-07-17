"use client";

import { useEffect, useState } from "react";
import { DataPagination } from "@/components/common/DataPagination";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  MousePointerClick,
  Copy,
  Loader2,
} from "lucide-react";
import { IntegrityCaseDetail } from "@/components/admin/IntegrityCaseDetail";
import { ListPageHeader } from "@/components/common/list/ListPageHeader";
import { SearchBar } from "@/components/common/list/SearchBar";
import { FilterPanel } from "@/components/common/list/FilterPanel";
import { ActiveFilterChips } from "@/components/common/list/ActiveFilterChips";
import {
  FilterDefinition,
  FilterValues,
  TextFilterValue,
} from "@/components/common/list/filter-types";
import {
  getActiveFilterCount,
  getFilterChips,
} from "@/components/common/list/filter-utils";
import api from "@/lib/api";

export interface FlaggedSubmission {
  id: string;
  submissionId?: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  submittedAt: string;
  confidence: "High" | "Medium" | "Low";
  status: "pending" | "reviewed" | "dismissed" | "confirmed";
  reasons: IntegrityReason[];
  similarityScore?: number;
  timeAnomaly?: boolean;
  patternMatch?: string[];
}

export interface IntegrityReason {
  type: "similarity" | "timing" | "pattern" | "behavior";
  description: string;
  weight: number;
  evidence?: string;
}

type IntegrityStats = {
  totalFlagged: number;
  pendingReview: number;
  highConfidence: number;
  confirmedCases: number;
};

type IntegrityPatterns = {
  tabSwitch: number;
  mouseAnomaly: number;
  copyPaste: number;
  otherBehavior: number;
};

type IntegrityCasesResponse = {
  data?: FlaggedSubmission[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: IntegrityStats;
  patterns?: IntegrityPatterns;
};

const EMPTY_STATS: IntegrityStats = {
  totalFlagged: 0,
  pendingReview: 0,
  highConfidence: 0,
  confirmedCases: 0,
};

const EMPTY_PATTERNS: IntegrityPatterns = {
  tabSwitch: 0,
  mouseAnomaly: 0,
  copyPaste: 0,
  otherBehavior: 0,
};

const EMPTY_FILTERS: FilterValues = {
  confidence: "all",
  submittedAt: { from: undefined, to: undefined },
  timeAnomaly: undefined,
  examTitle: { value: "", operator: "contains" },
};

const INTEGRITY_ROWS_PER_VIEW = 10;

export default function IntegrityOverview() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);
  const [selectedCase, setSelectedCase] = useState<FlaggedSubmission | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [submissions, setSubmissions] = useState<FlaggedSubmission[]>([]);
  const [stats, setStats] = useState<IntegrityStats>(EMPTY_STATS);
  const [patterns, setPatterns] = useState<IntegrityPatterns>(EMPTY_PATTERNS);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const integrityFilters: FilterDefinition[] = [
    {
      key: "confidence",
      label: "Mức tín hiệu",
      type: "select",
      allLabel: "Tất cả mức tín hiệu",
      options: [
        { label: "Cao", value: "High" },
        { label: "Trung bình", value: "Medium" },
        { label: "Thấp", value: "Low" },
      ],
    },
    {
      key: "examTitle",
      label: "Tên bài thi",
      type: "text",
      placeholder: "Lọc theo tên bài thi",
      operators: ["contains", "startsWith", "equals"],
      defaultOperator: "contains",
    },
    {
      key: "submittedAt",
      label: "Thời gian nộp",
      type: "date-range",
    },
    {
      key: "timeAnomaly",
      label: "Bất thường thời gian",
      type: "boolean",
      trueLabel: "Có tín hiệu",
      falseLabel: "Không có tín hiệu",
    },
  ];

  useEffect(() => {
    let mounted = true;

    const fetchCases = async () => {
      setLoading(true);
      setError(null);
      try {
        const examTitleFilter = appliedFilters.examTitle as
          | TextFilterValue
          | undefined;
        const submittedAtRange = appliedFilters.submittedAt as
          | { from?: string; to?: string }
          | undefined;
        const response = (await api.getIntegrityCases({
          page,
          limit: INTEGRITY_ROWS_PER_VIEW,
          search: appliedSearch || undefined,
          confidence: (appliedFilters.confidence as string | undefined) || "all",
          examTitle: examTitleFilter?.value?.trim() || undefined,
          submittedFrom: submittedAtRange?.from,
          submittedTo: submittedAtRange?.to,
          timeAnomaly: appliedFilters.timeAnomaly as boolean | undefined,
          status: activeTab,
        })) as IntegrityCasesResponse;

        if (!mounted) return;
        setSubmissions(Array.isArray(response.data) ? response.data : []);
        setStats(response.stats || EMPTY_STATS);
        setPatterns(response.patterns || EMPTY_PATTERNS);
        setTotalItems(response.pagination?.total || 0);
        setTotalPages(response.pagination?.totalPages || 1);
      } catch (err) {
        if (!mounted) return;
        setSubmissions([]);
        setStats(EMPTY_STATS);
        setPatterns(EMPTY_PATTERNS);
        setTotalItems(0);
        setTotalPages(1);
        setError(
          err instanceof Error ? err.message : "Không thể tải các trường hợp cần xem xét",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCases();
    return () => {
      mounted = false;
    };
  }, [activeTab, appliedFilters, appliedSearch, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const INTEGRITY_ROW_HEIGHT = 64;
  const INTEGRITY_TABLE_HEADER_HEIGHT = 48;
  const INTEGRITY_TABLE_MIN_HEIGHT =
    INTEGRITY_ROWS_PER_VIEW * INTEGRITY_ROW_HEIGHT +
    INTEGRITY_TABLE_HEADER_HEIGHT;

  const activeFilterCount = getActiveFilterCount(
    appliedFilters,
    integrityFilters,
  );
  const activeFilterChips = getFilterChips(appliedFilters, integrityFilters);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };
  const removeFilter = (key: string) => {
    const nextFilters = {
      ...appliedFilters,
      [key]: EMPTY_FILTERS[key as keyof typeof EMPTY_FILTERS],
    };
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const patternTotal = Math.max(
    1,
    patterns.tabSwitch +
      patterns.mouseAnomaly +
      patterns.copyPaste +
      patterns.otherBehavior,
  );

  const detectionPatterns = [
    {
      label: "Chuyển tab",
      description: "Sinh viên rời hoặc chuyển tab trong phiên thi",
      value: patterns.tabSwitch,
      icon: Shield,
      className: "bg-warning/10 text-warning",
    },
    {
      label: "Tín hiệu con trỏ",
      description: "Con trỏ không hoạt động hoặc có hành vi bất thường",
      value: patterns.mouseAnomaly,
      icon: MousePointerClick,
      className: "bg-destructive/10 text-destructive",
    },
    {
      label: "Sự kiện sao chép/dán",
      description: "Tương tác bộ nhớ tạm trong phiên thi",
      value: patterns.copyPaste,
      icon: Copy,
      className: "bg-info/10 text-info",
    },
    {
      label: "Tín hiệu hành vi khác",
      description: "Sự kiện tiêu điểm, toàn màn hình hoặc giám sát",
      value: patterns.otherBehavior,
      icon: TrendingUp,
      className: "bg-muted text-muted-foreground",
    },
  ];

  if (selectedCase) {
    return (
      <IntegrityCaseDetail
        submission={selectedCase}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <ListPageHeader title="Toàn vẹn học thuật" className="mb-4" />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Shield}
            value={stats.totalFlagged}
            label="Tổng tín hiệu"
            iconWrapClassName="bg-warning/10"
            iconClassName="text-warning"
          />
          <AdminStatCard
            icon={Clock}
            value={stats.pendingReview}
            label="Chờ xem xét"
            iconWrapClassName="bg-info/10"
            iconClassName="text-info"
          />
          <AdminStatCard
            icon={AlertTriangle}
            value={stats.highConfidence}
            label="Mức tín hiệu cao"
            iconWrapClassName="bg-destructive/10"
            iconClassName="text-destructive"
          />
          <AdminStatCard
            icon={XCircle}
            value={stats.confirmedCases}
            label="Đã xác nhận"
            iconWrapClassName="bg-destructive/10"
            iconClassName="text-destructive"
          />
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={runSearch}
              placeholder="Tìm theo sinh viên hoặc bài thi"
              className="flex-1"
            />
            <FilterPanel
              title="Bộ lọc tính toàn vẹn"
              description="Lọc theo mức tín hiệu, bài thi, ngày nộp và dấu hiệu bất thường."
              filters={integrityFilters}
              value={draftFilters}
              onValueChange={(key, nextValue) =>
                setDraftFilters((prev) => ({ ...prev, [key]: nextValue }))
              }
              onApply={applyFilters}
              onClear={clearFilters}
              activeCount={activeFilterCount}
            />
          </div>
          <ActiveFilterChips
            chips={activeFilterChips}
            onRemove={removeFilter}
            onClearAll={clearFilters}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v);
                setPage(1);
              }}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="pending">Chờ xem xét</TabsTrigger>
                <TabsTrigger value="reviewed">Đã xem xét</TabsTrigger>
                <TabsTrigger value="confirmed">Đã xác nhận</TabsTrigger>
                <TabsTrigger value="dismissed">Đã loại trừ</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div
                  className="overflow-hidden"
                  style={{ minHeight: INTEGRITY_TABLE_MIN_HEIGHT }}
                >
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sinh viên</TableHead>
                          <TableHead>Bài thi</TableHead>
                          <TableHead>Thời gian nộp</TableHead>
                          <TableHead>Mức tín hiệu</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Tín hiệu chính</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-muted-foreground"
                            >
                              <div className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang tải các trường hợp cần xem xét...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-destructive"
                            >
                              {error}
                            </TableCell>
                          </TableRow>
                        ) : submissions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Không tìm thấy bài nộp có tín hiệu cần xem xét
                            </TableCell>
                          </TableRow>
                        ) : (
                          submissions.map((submission) => (
                            <TableRow key={submission.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {submission.studentName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {submission.studentId}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-foreground">
                                  {submission.examTitle}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(submission.submittedAt)}
                                </p>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={submission.confidence}
                                  domain="confidence"
                                >
                                  {submission.confidence === "High" ? "Cao" : submission.confidence === "Medium" ? "Trung bình" : "Thấp"}
                                </StatusBadge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={submission.status}
                                  domain="integrity"
                                >
                                  {submission.status === "pending" ? "Chờ xem xét" : submission.status === "reviewed" ? "Đã xem xét" : submission.status === "confirmed" ? "Đã xác nhận" : "Đã loại trừ"}
                                </StatusBadge>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground max-w-xs truncate">
                                  {submission.reasons[0]?.description}
                                </p>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedCase(submission)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Xem xét
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage}
              itemLabel="bài nộp cần xem xét"
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nhóm tín hiệu ghi nhận</CardTitle>
              <CardDescription>
                Các nhóm tín hiệu thường gặp từ dữ liệu phiên thi; đây không phải kết luận gian lận
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {detectionPatterns.map((pattern) => {
                const percentage = Math.round((pattern.value / patternTotal) * 100);
                return (
                  <div
                    key={pattern.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded flex items-center justify-center ${pattern.className}`}
                      >
                        <pattern.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pattern.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {pattern.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hướng dẫn xem xét</CardTitle>
              <CardDescription>
                Nguyên tắc xem xét tín hiệu toàn vẹn học thuật
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">
                    Xem xét đầy đủ bằng chứng trước khi quyết định
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Cân nhắc toàn bộ bối cảnh, bao gồm điều kiện thi và lịch sử của sinh viên
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">Ghi lại căn cứ đánh giá</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Thêm ghi chú giải thích lý do xác nhận hoặc loại trừ trường hợp
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">
                    Chuyển cấp các trường hợp chưa rõ ràng
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Mời hội đồng học thuật tham gia với tình huống quan trọng hoặc còn mơ hồ
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminPageShell>
    </DashboardLayout>
  );
}
