"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
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
  Users,
  FileText,
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

export interface FlaggedSubmission {
  id: string;
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

// Mock data for flagged submissions
const mockFlaggedSubmissions: FlaggedSubmission[] = [
  {
    id: "flag-001",
    studentId: "STU-2024-0892",
    studentName: "Alex Johnson",
    examId: "exam-ds-final",
    examTitle: "Data Structures Final",
    submittedAt: "2024-01-15T14:32:00Z",
    confidence: "High",
    status: "pending",
    similarityScore: 87,
    timeAnomaly: true,
    reasons: [
      {
        type: "similarity",
        description: "Answer pattern similarity with STU-2024-1034",
        weight: 0.45,
        evidence:
          "Questions 12-18 show 94% similarity in answer sequence and timing",
      },
      {
        type: "timing",
        description: "Abnormal response time pattern",
        weight: 0.3,
        evidence:
          "Average response time dropped from 45s to 8s after question 10",
      },
      {
        type: "behavior",
        description: "Tab focus loss detected",
        weight: 0.25,
        evidence: "12 instances of window blur events during exam",
      },
    ],
    patternMatch: ["STU-2024-1034"],
  },
  {
    id: "flag-002",
    studentId: "STU-2024-1034",
    studentName: "Maria Garcia",
    examId: "exam-ds-final",
    examTitle: "Data Structures Final",
    submittedAt: "2024-01-15T14:28:00Z",
    confidence: "High",
    status: "pending",
    similarityScore: 87,
    reasons: [
      {
        type: "similarity",
        description: "Answer pattern similarity with STU-2024-0892",
        weight: 0.5,
        evidence: "Questions 12-18 show 94% similarity in answer sequence",
      },
      {
        type: "pattern",
        description: "Identical wrong answer pattern",
        weight: 0.35,
        evidence: "Same incorrect answers on questions 14, 16, 17",
      },
    ],
    patternMatch: ["STU-2024-0892"],
  },
  {
    id: "flag-003",
    studentId: "STU-2024-0567",
    studentName: "James Wilson",
    examId: "exam-algo-mid",
    examTitle: "Algorithms Midterm",
    submittedAt: "2024-01-14T10:15:00Z",
    confidence: "Medium",
    status: "reviewed",
    similarityScore: 62,
    timeAnomaly: true,
    reasons: [
      {
        type: "timing",
        description: "Rapid sequential correct answers",
        weight: 0.6,
        evidence:
          "Questions 5-12 answered in under 3 seconds each with 100% accuracy",
      },
      {
        type: "behavior",
        description: "Copy-paste event detected",
        weight: 0.4,
        evidence: "3 paste events detected in essay responses",
      },
    ],
  },
  {
    id: "flag-004",
    studentId: "STU-2024-0234",
    studentName: "Sarah Chen",
    examId: "exam-db-quiz",
    examTitle: "Database Systems Quiz",
    submittedAt: "2024-01-13T16:45:00Z",
    confidence: "Low",
    status: "dismissed",
    reasons: [
      {
        type: "timing",
        description: "Unusual submission timing",
        weight: 1.0,
        evidence:
          "Submitted 2 minutes before deadline after 45 minutes of inactivity",
      },
    ],
  },
  {
    id: "flag-005",
    studentId: "STU-2024-0789",
    studentName: "Michael Brown",
    examId: "exam-os-final",
    examTitle: "Operating Systems Final",
    submittedAt: "2024-01-12T11:20:00Z",
    confidence: "High",
    status: "confirmed",
    similarityScore: 92,
    reasons: [
      {
        type: "similarity",
        description: "Near-identical essay response",
        weight: 0.7,
        evidence: "Essay response shows 92% text similarity with online source",
      },
      {
        type: "pattern",
        description: "External source match",
        weight: 0.3,
        evidence: "Content matches published solution on external website",
      },
    ],
  },
];

const stats = {
  totalFlagged: 23,
  pendingReview: 8,
  highConfidence: 5,
  confirmedCases: 3,
};

const EMPTY_FILTERS: FilterValues = {
  confidence: "all",
  submittedAt: { from: undefined, to: undefined },
  timeAnomaly: undefined,
  examTitle: { value: "", operator: "contains" },
};

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

  const integrityFilters: FilterDefinition[] = [
    {
      key: "confidence",
      label: "Confidence",
      type: "select",
      allLabel: "All Confidence",
      options: [
        { label: "High", value: "High" },
        { label: "Medium", value: "Medium" },
        { label: "Low", value: "Low" },
      ],
    },
    {
      key: "examTitle",
      label: "Exam Title",
      type: "text",
      placeholder: "Filter by exam title",
      operators: ["contains", "startsWith", "equals"],
      defaultOperator: "contains",
    },
    {
      key: "submittedAt",
      label: "Submitted At",
      type: "date-range",
    },
    {
      key: "timeAnomaly",
      label: "Time anomaly",
      type: "boolean",
      trueLabel: "Flagged",
      falseLabel: "Not flagged",
    },
  ];

  const normalizedSearch = appliedSearch.trim().toLowerCase();

  const filteredSubmissions = mockFlaggedSubmissions.filter((submission) => {
    const matchesSearch =
      !normalizedSearch ||
      submission.studentName.toLowerCase().includes(normalizedSearch) ||
      submission.studentId.toLowerCase().includes(normalizedSearch) ||
      submission.examTitle.toLowerCase().includes(normalizedSearch);

    const confidenceValue = appliedFilters.confidence as string | undefined;
    const examTitleFilter = appliedFilters.examTitle as
      | TextFilterValue
      | undefined;
    const submittedAtRange = appliedFilters.submittedAt as
      | { from?: string; to?: string }
      | undefined;
    const timeAnomaly = appliedFilters.timeAnomaly as boolean | undefined;

    const matchesText = (source: string, filter?: TextFilterValue) => {
      if (!filter || !filter.value.trim()) return true;
      const sourceValue = source.toLowerCase();
      const filterValue = filter.value.trim().toLowerCase();
      if (filter.operator === "startsWith")
        return sourceValue.startsWith(filterValue);
      if (filter.operator === "equals") return sourceValue === filterValue;
      return sourceValue.includes(filterValue);
    };

    const matchesConfidence =
      !confidenceValue ||
      confidenceValue === "all" ||
      submission.confidence === confidenceValue;
    const matchesExamTitle = matchesText(submission.examTitle, examTitleFilter);
    const matchesTimeAnomaly =
      typeof timeAnomaly !== "boolean" ||
      timeAnomaly === submission.timeAnomaly;
    const matchesSubmittedAt = (() => {
      if (!submittedAtRange?.from && !submittedAtRange?.to) return true;
      const submittedAt = new Date(submission.submittedAt).getTime();
      if (submittedAtRange.from) {
        const from = new Date(submittedAtRange.from).getTime();
        if (!Number.isNaN(from) && submittedAt < from) return false;
      }
      if (submittedAtRange.to) {
        const to = new Date(submittedAtRange.to).getTime();
        if (!Number.isNaN(to) && submittedAt > to) return false;
      }
      return true;
    })();

    if (activeTab === "all") {
      return (
        matchesSearch &&
        matchesConfidence &&
        matchesExamTitle &&
        matchesTimeAnomaly &&
        matchesSubmittedAt
      );
    }

    return (
      matchesSearch &&
      submission.status === activeTab &&
      matchesConfidence &&
      matchesExamTitle &&
      matchesTimeAnomaly &&
      matchesSubmittedAt
    );
  });

  const INTEGRITY_ROWS_PER_VIEW = 10;
  const displayedSubmissions = filteredSubmissions.slice(
    (page - 1) * INTEGRITY_ROWS_PER_VIEW,
    page * INTEGRITY_ROWS_PER_VIEW,
  );
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / INTEGRITY_ROWS_PER_VIEW));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
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

  const runSearch = () => { setAppliedSearch(searchInput.trim()); setPage(1); };
  const applyFilters = () => { setAppliedFilters(draftFilters); setPage(1); };
  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };
  const removeFilter = (key: string) => {
    const nextFilters = {
      ...appliedFilters,
      [key]: EMPTY_FILTERS[key as keyof typeof EMPTY_FILTERS],
    };
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <ListPageHeader title="Academic Integrity" className="mb-4" />

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Shield}
            value={stats.totalFlagged}
            label="Total Flagged"
            iconWrapClassName="bg-warning/10"
            iconClassName="text-warning"
          />
          <AdminStatCard
            icon={Clock}
            value={stats.pendingReview}
            label="Pending Review"
            iconWrapClassName="bg-info/10"
            iconClassName="text-info"
          />
          <AdminStatCard
            icon={AlertTriangle}
            value={stats.highConfidence}
            label="High Confidence"
            iconWrapClassName="bg-destructive/10"
            iconClassName="text-destructive"
          />
          <AdminStatCard
            icon={XCircle}
            value={stats.confirmedCases}
            label="Confirmed Cases"
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
              placeholder="Search by student or exam"
              className="flex-1"
            />
            <FilterPanel
              title="Integrity filters"
              description="Filter by confidence, title, submission date, and anomaly signals."
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
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
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
                          <TableHead>Student</TableHead>
                          <TableHead>Exam</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Primary Reason</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedSubmissions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No flagged submissions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayedSubmissions.map((submission) => (
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
                                  {submission.confidence}
                                </StatusBadge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={submission.status}
                                  domain="integrity"
                                >
                                  {submission.status}
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
                                  Review
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
              totalItems={filteredSubmissions.length}
              onPageChange={setPage}
              itemLabel="flagged submissions"
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detection Patterns</CardTitle>
              <CardDescription>
                Common integrity violation types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Answer Similarity</p>
                    <p className="text-xs text-muted-foreground">
                      Similar patterns between students
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">42%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-warning/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timing Anomalies</p>
                    <p className="text-xs text-muted-foreground">
                      Abnormal response patterns
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">28%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-info/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">External Sources</p>
                    <p className="text-xs text-muted-foreground">
                      Content matching online materials
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">18%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Behavioral Signals</p>
                    <p className="text-xs text-muted-foreground">
                      Tab switching, copy-paste events
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">12%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Guidelines</CardTitle>
              <CardDescription>
                Best practices for integrity review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">
                    Review all evidence before deciding
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Consider the full context including exam conditions and
                  student history
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">Document your reasoning</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Add notes explaining why a case was confirmed or dismissed
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">
                    Escalate uncertain cases
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Involve academic board for high-stakes or ambiguous situations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminPageShell>
    </DashboardLayout>
  );
}

