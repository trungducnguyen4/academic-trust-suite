import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Download,
  Lock,
  Loader2,
  TrendingUp,
  Target,
  Award,
  Filter,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNow, addHours } from 'date-fns';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UpcomingExam {
  id: string;
  title: string;
  course: { code: string; name: string };
  duration: number;
  startTime: string;
  endTime: string;
  status: string;
  requiresDownload?: boolean;
  mySubmissionStatus?: string | null;
}

interface ExamHistoryItem {
  id: string;
  examId: string;
  exam: { title: string; course: { code: string }; totalPoints: number; passingScore: number };
  score: number | null;
  status: string;
  submittedAt: string | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [exams, submissions] = await Promise.all([
          api.getAvailableExams(),
          api.getMySubmissions(),
        ]);
        // try to load real course data for this student from backend
        let myCourses: any[] = [];
        try {
          myCourses = await api.getMyCourses();
        } catch (err) {
          console.warn('getMyCourses failed, falling back to mock courses', err);
        }
        // simple mock fallback if backend returns nothing
        const mockCourses = [
          { id: 'c1', code: 'HK1_2025_504074', name: 'Kiến tập Công nghiệp', faculty: 'Faculty of Information Technology', enrolledStudents: 38, totalStudents: 40, progress: 33, lastAccessed: '2 days ago' },
          { id: 'c2', code: 'HK2_2024_502071', name: 'Phát triển ứng dụng di động', faculty: 'Faculty of Information Technology', enrolledStudents: 42, totalStudents: 45, progress: 65, lastAccessed: '3 hours ago' },
          { id: 'c3', code: 'HK2_2024_503111', name: 'Công nghệ Java', faculty: 'Faculty of Information Technology', enrolledStudents: 35, totalStudents: 40, progress: 90, lastAccessed: '5 hours ago' },
          { id: 'c4', code: 'HK3_2023_304105', name: 'Lịch sử Đảng Cộng sản Việt Nam', faculty: 'Faculty of Social Sciences and Humanities', enrolledStudents: 45, totalStudents: 50, progress: 75, lastAccessed: '1 day ago' }
        ];
        const now = new Date();
        const latestSubmissionByExamId = new Map<string, any>();
        (submissions || []).forEach((s: any) => {
          const key = s?.examId;
          if (!key) return;
          const prev = latestSubmissionByExamId.get(key);
          const currentTime = new Date(s?.submittedAt || s?.startedAt || s?.createdAt || 0).getTime();
          const prevTime = prev ? new Date(prev?.submittedAt || prev?.startedAt || prev?.createdAt || 0).getTime() : -1;
          if (!prev || currentTime >= prevTime) {
            latestSubmissionByExamId.set(key, s);
          }
        });

        const upcoming = exams.filter((exam: any) => {
          const endTime = new Date(exam.endTime);
          return exam.status === 'PUBLISHED' && endTime > now;
        }).map((exam: any) => ({
          ...exam,
          requiresDownload: exam.settings?.proctoring || false,
          mySubmissionStatus: latestSubmissionByExamId.get(exam.id)?.status ?? null,
        }));
        
        setUpcomingExams(upcoming);
       setExamHistory(submissions.filter((s: any) => s.status === 'GRADED' || s.status === 'SUBMITTED'));

        const safeRelativeTime = (raw: any): string => {
          if (!raw) return '—';
          const d = new Date(raw);
          if (isNaN(d.getTime())) return typeof raw === 'string' ? raw : '—';
          return formatDistanceToNow(d, { addSuffix: true });
        };

        const normaliseCourses = (list: any[]) =>
          list.map((c: any) => ({
            ...c,
            lastAccessed: safeRelativeTime(c.lastAccessed),
          }));

        const finalCourses = myCourses && myCourses.length
          ? normaliseCourses(myCourses)
          : mockCourses;
        setCourses(finalCourses);
        setRecentCourses(finalCourses.slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const notifications = [
    {
      id: '1',
      type: 'info' as const,
      message: examHistory.length > 0 
        ? `Results for "${examHistory[0]?.exam?.title}" are available` 
        : 'No new notifications',
      time: addHours(new Date(), -2),
    },
    {
      id: '2',
      type: 'warning' as const,
      message: upcomingExams.length > 0 
        ? `Reminder: "${upcomingExams[0]?.title}" is coming up` 
        : 'No upcoming exams',
      time: addHours(new Date(), -5),
    },
  ];

  const handleDownload = async (examId: string) => {
    setDownloadProgress((p) => ({ ...p, [examId]: 0 }));
    for (let i = 2; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 40));
      setDownloadProgress((p) => ({ ...p, [examId]: i }));
    }
  };

  const passedExams = examHistory.filter((e) => e.score !== null && e.exam?.passingScore && e.score >= e.exam.passingScore);
  const avgScore = examHistory.length > 0 
    ? Math.round(examHistory.reduce((acc, e) => acc + (e.score || 0), 0) / examHistory.length) 
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in opacity-0">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {upcomingExams.length > 0 
              ? `You have ${upcomingExams.length} upcoming exam${upcomingExams.length > 1 ? 's' : ''}`
              : "You're all caught up. No upcoming exams."}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Upcoming Exams', value: upcomingExams.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10', gradient: 'card-gradient-blue', sub: 'Scheduled' },
            { label: 'Exams Passed', value: `${passedExams.length}/${examHistory.length}`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-500/10', gradient: 'card-gradient-emerald', sub: 'Pass rate' },
            { label: 'Average Score', value: `${avgScore}%`, icon: Target, color: 'text-violet-600', bg: 'bg-violet-500/10', gradient: 'card-gradient-violet', sub: 'Overall performance' },
          ].map((stat, i) => (
            <Card key={stat.label} className={`card-elevated ${stat.gradient} animate-fade-in-up opacity-0 stagger-${i + 1}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.sub}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Course overview (matches lecturer style) */}
          <div className="lg:col-span-3">
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Course overview</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    All (except removed from view)
                  </Button>
                  <Select defaultValue="name">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Course name</SelectItem>
                      <SelectItem value="code">Course code</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="card">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="space-y-6">
                  {/* group by faculty */}
                  {Object.entries(courses.reduce((acc:any, c:any) => { const f = c.faculty||'Other'; (acc[f]||(acc[f]=[])).push(c); return acc; }, {})).map(([faculty, facultyCourses]: any) => (
                    <div key={faculty}>
                      <h3 className="text-lg font-medium mb-3">{faculty}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {facultyCourses.map((course:any, index:number) => (
                          <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className={`h-24 ${['bg-gradient-to-br from-pink-400 to-pink-600','bg-gradient-to-br from-purple-400 to-indigo-600','bg-gradient-to-br from-blue-400 to-cyan-600','bg-gradient-to-br from-green-400 to-emerald-600'][index%4]} relative`}>
                              <div className="absolute inset-0 bg-black/20" />
                              <div className="absolute top-3 right-3">
                                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-medium text-sm">{course.code}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{course.name}</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{course.enrolledStudents}/{course.totalStudents}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{course.lastAccessed}</span>
                                  </div>
                                </div>
                                {course.progress != null && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>{course.progress}% complete</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${course.progress}%` }} />
                                    </div>
                                  </div>
                                )}
                                <Button asChild variant="outline" size="sm" className="w-full">
                                  <Link to={`/student/courses/${course.id}`}>View Details</Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Upcoming Exams */}
          <div className="lg:col-span-2">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Upcoming Exams</CardTitle>
                  <CardDescription>Your scheduled examinations</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1 rounded-xl" asChild>
                  <Link to="/student/exams">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingExams.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No upcoming exams</p>
                      <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
                    </div>
                  ) : upcomingExams.map((exam, i) => {
                    const scheduledAt = new Date(exam.startTime);
                    const isToday = scheduledAt.toDateString() === new Date().toDateString();
                    const progress = downloadProgress[exam.id];
                    const isDownloading = progress !== undefined && progress < 100;
                    const isDownloaded = progress === 100;
                    const needsDownload = exam.requiresDownload === true;
                    const status = String(exam.mySubmissionStatus || '').toUpperCase();
                    const isCompletedAttempt = ['SUBMITTED', 'GRADED', 'FLAGGED'].includes(status);
                    const startUrl = `/student/exam-ready?examId=${exam.id}&download=false&title=${encodeURIComponent(exam.title)}&course=${encodeURIComponent(exam.course.code)}&duration=${exam.duration}`;

                    const todayCTA = isCompletedAttempt ? (
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={status === 'GRADED' ? 'success' : 'warning'}>
                          {status.toLowerCase()}
                        </StatusBadge>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/student/grading?examId=${exam.id}`}>View Result</Link>
                        </Button>
                      </div>
                    ) : needsDownload ? (
                      isDownloaded ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                          <Lock className="h-4 w-4" />
                          Waiting for unlock
                        </div>
                      ) : isDownloading ? (
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Downloading {progress}%
                          </div>
                          <Progress value={progress} className="h-1.5 w-28" />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50 rounded-xl"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(exam.id); }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      )
                    ) : (
                      <Button size="sm" className="rounded-xl shadow-sm" asChild>
                        <Link to={startUrl}>Start Now</Link>
                      </Button>
                    );

                    return (
                      <div
                        key={exam.id}
                        className={`flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-secondary/50 hover:border-primary/10 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-semibold text-foreground">{exam.title}</h4>
                            {isToday && (
                              <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-700 rounded-md font-semibold">Today</span>
                            )}
                            {needsDownload && isDownloaded && (
                              <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-700 rounded-md font-semibold">LOCKED</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <BookOpen className="h-3 w-3" />
                              {exam.course.code}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(scheduledAt, 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exam.duration} min
                            </span>
                          </div>
                        </div>
                        {isToday ? todayCTA : (
                          <StatusBadge variant="info">
                            {formatDistanceToNow(scheduledAt, { addSuffix: true })}
                          </StatusBadge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications moved to header bell dropdown for compact responsive UI */}
        </div>

        {/* Recent Results */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Recent Results</CardTitle>
              <CardDescription>Your exam history and scores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1 rounded-xl" asChild>
              <Link to="/student/results">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Award className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No exam results yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Complete exams to see your results here</p>
                </div>
              ) : examHistory.map((submission, i) => {
                const score = submission.score || 0;
                const maxScore = submission.exam?.totalPoints || 100;
                const passingScore = submission.exam?.passingScore || 50;
                const passed = score >= passingScore;
                const completedAt = submission.submittedAt ? new Date(submission.submittedAt) : new Date();
                const pct = Math.round((score / maxScore) * 100);
                
                return (
                  <Link
                    key={submission.id}
                    to={`/student/grading?examId=${submission.examId}`}
                    className={`flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-secondary/50 hover:border-primary/10 transition-all duration-200 animate-fade-in opacity-0 stagger-${i + 1}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                        passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{submission.exam?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {submission.exam?.course?.code} · {format(completedAt, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          {score}/{maxScore}
                        </p>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                      <StatusBadge variant={passed ? 'success' : 'destructive'}>
                        {passed ? 'Passed' : 'Failed'}
                      </StatusBadge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
