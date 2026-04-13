import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { BookOpen, Calendar, Clock, FileText } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api, { unwrapPaginatedData } from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

type Course = {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  semester?: string;
  credits?: number;
};

type Exam = {
  id: string;
  title: string;
  status: string;
  startTime?: string | null;
  duration?: number;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};

export default function StudentCourseDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Course id is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [courseRes, examsRes] = await Promise.all([
          api.getCourse(id),
          api.getExams({ courseId: id, limit: 50 }),
        ]);

        setCourse(courseRes || null);
        setExams(unwrapPaginatedData<Exam>(examsRes));
      } catch (err: any) {
        const message = err?.message || "Unable to load course details.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const sortedExams = useMemo(
    () =>
      [...exams].sort((a, b) => {
        const aTs = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTs = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTs - aTs;
      }),
    [exams],
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <BackToDashboardButton to="/student" className="-ml-2" />

          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {course?.name || "Course Details"}
              </h1>
              {course?.code && <Badge variant="secondary">{course.code}</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {course?.description ||
                "No description available for this course."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Semester: {course?.semester || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Credits: {course?.credits ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading course data...
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium text-foreground">
                Could not load this course.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Exams In This Course</CardTitle>
              <CardDescription>{sortedExams.length} exam(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedExams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  No exams available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedExams.map((exam) => {
                    const canJoin =
                      exam.status === "PUBLISHED" || exam.status === "ONGOING";
                    return (
                      <div
                        key={exam.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {exam.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {exam.startTime
                                ? format(
                                    new Date(exam.startTime),
                                    "MMM d, yyyy HH:mm",
                                  )
                                : "Not scheduled"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {exam.duration || 0} min
                            </span>
                            <Badge variant="outline">
                              {statusLabel[exam.status] || exam.status}
                            </Badge>
                          </div>
                        </div>

                        {canJoin ? (
                          <Button asChild>
                            <Link to={`/student/exam-ready?examId=${exam.id}`}>
                              Open Exam
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            Not Available
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
