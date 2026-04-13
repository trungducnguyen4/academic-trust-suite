import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Award } from "lucide-react";
import api from "@/lib/api";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

export default function StudentResults() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await api.getMySubmissions();
        if (mounted) setSubmissions(data || []);
      } catch (err) {
        console.error("Failed to load submissions", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackToDashboardButton to="/student" className="-ml-2" />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Results</h1>
          <p className="text-muted-foreground mt-1">
            Your past submissions and grades
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Results</CardTitle>
            <CardDescription>Graded and submitted exams</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">No results yet</p>
                  </div>
                ) : (
                  submissions.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {s.exam?.title ?? s.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {s.exam?.course?.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.status} • {s.score !== null ? s.score : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm">
                          <Link
                            to={`/student/grading?examId=${s.examId ?? s.exam?.id}`}
                          >
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
