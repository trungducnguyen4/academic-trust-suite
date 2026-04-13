import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react';
import { IntegrityCaseDetail } from '@/components/admin/IntegrityCaseDetail';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

export interface FlaggedSubmission {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  submittedAt: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed';
  reasons: IntegrityReason[];
  similarityScore?: number;
  timeAnomaly?: boolean;
  patternMatch?: string[];
}

export interface IntegrityReason {
  type: 'similarity' | 'timing' | 'pattern' | 'behavior';
  description: string;
  weight: number;
  evidence?: string;
}

// Mock data for flagged submissions
const mockFlaggedSubmissions: FlaggedSubmission[] = [
  {
    id: 'flag-001',
    studentId: 'STU-2024-0892',
    studentName: 'Alex Johnson',
    examId: 'exam-ds-final',
    examTitle: 'Data Structures Final',
    submittedAt: '2024-01-15T14:32:00Z',
    confidence: 'High',
    status: 'pending',
    similarityScore: 87,
    timeAnomaly: true,
    reasons: [
      {
        type: 'similarity',
        description: 'Answer pattern similarity with STU-2024-1034',
        weight: 0.45,
        evidence: 'Questions 12-18 show 94% similarity in answer sequence and timing',
      },
      {
        type: 'timing',
        description: 'Abnormal response time pattern',
        weight: 0.30,
        evidence: 'Average response time dropped from 45s to 8s after question 10',
      },
      {
        type: 'behavior',
        description: 'Tab focus loss detected',
        weight: 0.25,
        evidence: '12 instances of window blur events during exam',
      },
    ],
    patternMatch: ['STU-2024-1034'],
  },
  {
    id: 'flag-002',
    studentId: 'STU-2024-1034',
    studentName: 'Maria Garcia',
    examId: 'exam-ds-final',
    examTitle: 'Data Structures Final',
    submittedAt: '2024-01-15T14:28:00Z',
    confidence: 'High',
    status: 'pending',
    similarityScore: 87,
    reasons: [
      {
        type: 'similarity',
        description: 'Answer pattern similarity with STU-2024-0892',
        weight: 0.50,
        evidence: 'Questions 12-18 show 94% similarity in answer sequence',
      },
      {
        type: 'pattern',
        description: 'Identical wrong answer pattern',
        weight: 0.35,
        evidence: 'Same incorrect answers on questions 14, 16, 17',
      },
    ],
    patternMatch: ['STU-2024-0892'],
  },
  {
    id: 'flag-003',
    studentId: 'STU-2024-0567',
    studentName: 'James Wilson',
    examId: 'exam-algo-mid',
    examTitle: 'Algorithms Midterm',
    submittedAt: '2024-01-14T10:15:00Z',
    confidence: 'Medium',
    status: 'reviewed',
    similarityScore: 62,
    timeAnomaly: true,
    reasons: [
      {
        type: 'timing',
        description: 'Rapid sequential correct answers',
        weight: 0.60,
        evidence: 'Questions 5-12 answered in under 3 seconds each with 100% accuracy',
      },
      {
        type: 'behavior',
        description: 'Copy-paste event detected',
        weight: 0.40,
        evidence: '3 paste events detected in essay responses',
      },
    ],
  },
  {
    id: 'flag-004',
    studentId: 'STU-2024-0234',
    studentName: 'Sarah Chen',
    examId: 'exam-db-quiz',
    examTitle: 'Database Systems Quiz',
    submittedAt: '2024-01-13T16:45:00Z',
    confidence: 'Low',
    status: 'dismissed',
    reasons: [
      {
        type: 'timing',
        description: 'Unusual submission timing',
        weight: 1.0,
        evidence: 'Submitted 2 minutes before deadline after 45 minutes of inactivity',
      },
    ],
  },
  {
    id: 'flag-005',
    studentId: 'STU-2024-0789',
    studentName: 'Michael Brown',
    examId: 'exam-os-final',
    examTitle: 'Operating Systems Final',
    submittedAt: '2024-01-12T11:20:00Z',
    confidence: 'High',
    status: 'confirmed',
    similarityScore: 92,
    reasons: [
      {
        type: 'similarity',
        description: 'Near-identical essay response',
        weight: 0.70,
        evidence: 'Essay response shows 92% text similarity with online source',
      },
      {
        type: 'pattern',
        description: 'External source match',
        weight: 0.30,
        evidence: 'Content matches published solution on external website',
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

export default function IntegrityOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<FlaggedSubmission | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredSubmissions = mockFlaggedSubmissions.filter((submission) => {
    const matchesSearch =
      submission.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.examTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && submission.status === 'pending';
    if (activeTab === 'reviewed') return matchesSearch && submission.status === 'reviewed';
    if (activeTab === 'confirmed') return matchesSearch && submission.status === 'confirmed';
    if (activeTab === 'dismissed') return matchesSearch && submission.status === 'dismissed';
    return matchesSearch;
  });

  const getConfidenceBadgeVariant = (confidence: string): 'destructive' | 'warning' | 'default' => {
    switch (confidence) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string): 'warning' | 'info' | 'destructive' | 'default' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'info';
      case 'confirmed':
        return 'destructive';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      <div className="space-y-6">
        <BackToDashboardButton to="/admin" className="-ml-2" />

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Academic Integrity Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Review flagged submissions and manage integrity cases
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.totalFlagged}</p>
                  <p className="text-sm text-muted-foreground">Total Flagged</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.pendingReview}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.highConfidence}</p>
                  <p className="text-sm text-muted-foreground">High Confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.confirmedCases}</p>
                  <p className="text-sm text-muted-foreground">Confirmed Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Flagged Submissions</CardTitle>
                <CardDescription>
                  AI-detected potential integrity violations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student or exam..."
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div className="overflow-x-auto">
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
                      {filteredSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No flagged submissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubmissions.map((submission) => (
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
                              <p className="text-sm text-foreground">{submission.examTitle}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(submission.submittedAt)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusBadge variant={getConfidenceBadgeVariant(submission.confidence)}>
                                {submission.confidence}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge variant={getStatusBadgeVariant(submission.status)}>
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
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
          </CardContent>
        </Card>

        {/* Integrity Insights */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detection Patterns</CardTitle>
              <CardDescription>Common integrity violation types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Answer Similarity</p>
                    <p className="text-xs text-muted-foreground">Similar patterns between students</p>
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
                    <p className="text-xs text-muted-foreground">Abnormal response patterns</p>
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
                    <p className="text-xs text-muted-foreground">Content matching online materials</p>
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
                    <p className="text-xs text-muted-foreground">Tab switching, copy-paste events</p>
                  </div>
                </div>
                <span className="text-sm font-semibold">12%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Guidelines</CardTitle>
              <CardDescription>Best practices for integrity review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium">Review all evidence before deciding</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Consider the full context including exam conditions and student history
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
                  <p className="text-sm font-medium">Escalate uncertain cases</p>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Involve academic board for high-stakes or ambiguous situations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
