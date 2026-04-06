import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function TransparencyDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>System Transparency Dashboard</CardTitle>
            <p className="text-muted-foreground mt-2">
              High-level reporting on transparency, statistics, validation, and academic decisions in the system.
            </p>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Statistical Summary</h2>
              <p>
                Aggregate key metrics: number of exams, question volume, student participation, average score, discrimination, and difficulty.<br />
                <b>Example:</b> 10 exams, 500 questions, 200 students, average score: 7.5
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Integrity Alerts & Evidence</h2>
              <p>
                Report AI alerts, integrity evidence, and committee decisions.<br />
                <b>Example:</b> 5 alerts, 2 decisions of "No Cheating", 1 decision of "Cheating"
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Academic Actions</h2>
              <p>
                Academic decisions based on evidence, event logs, and statistics.<br />
                <b>Example:</b> 1 student suspended, 2 students warned
              </p>
            </section>
            <Separator className="my-4" />
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Audit Log</h2>
              <p>
                Store and display system activity history, policy updates, and decisions.<br />
                <b>Example:</b> 2026-01-10: Integrity policy updated
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
