import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ExamReadyCheck() {
  const [agreed, setAgreed] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-1">Final Examination: Advanced Algorithms</CardTitle>
                <div className="text-muted-foreground text-base">CS402 - Faculty of Computer Science</div>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded">OFFICIAL SESSION</span>
            </div>
            <div className="flex gap-6 mt-6">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">120 Minutes</span>
                <span className="text-xs text-muted-foreground mt-1">DURATION</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">45 Items</span>
                <span className="text-xs text-muted-foreground mt-1">QUESTIONS</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="font-semibold text-xs mb-2 text-muted-foreground">SYSTEM READINESS CHECK</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded text-green-700 text-sm">
                  <span role="img" aria-label="camera">📷</span> Camera
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded text-green-700 text-sm">
                  <span role="img" aria-label="mic">🎤</span> Microphone
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded text-green-700 text-sm">
                  <span role="img" aria-label="wifi">📶</span> Internet
                </div>
              </div>
            </div>
            <div className="mb-6">
              <div className="font-semibold text-xs mb-2 text-muted-foreground">Integrity & Fairness Notice</div>
              <div className="bg-orange-50 border border-orange-200 rounded p-4 text-sm text-orange-900">
                <ul className="list-disc pl-5 space-y-1">
                  <li>You are alone in a quiet room with no unauthorized materials.</li>
                  <li>The use of AI assistants, external search engines, or messaging apps is strictly prohibited.</li>
                  <li>Your screen, webcam, and microphone will be monitored for the duration of the exam to ensure academic fairness.</li>
                  <li>Any detected irregularities will be flagged for secondary review by the department board.</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <label htmlFor="agree" className="text-sm">
                I understand and agree to the exam rules and proctoring conditions.
              </label>
            </div>
            <div className="flex gap-2">
              <Button asChild disabled={!agreed} className="flex-1">
                <Link to="/student/exam-taking">Start Exam Now</Link>
              </Button>
              <Button variant="secondary" asChild className="flex-1">
                <Link to="/student">Return to Dashboard</Link>
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-6">
              Session ID: EXM-2024-ADAL-001 • Encrypted SSL Connection Active
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
