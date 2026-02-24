import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Mock data for demo
const questions = [
  {
    id: 1,
    title: 'Macroeconomic Dynamics',
    content:
      'Consider a standard Solow-Swan growth model where the production function is given by (Y = K^alpha (AL)^{1-alpha}). If the population growth rate (n) increases while the savings rate (s) and the rate of technological progress (g) remain constant, what is the most likely long-term effect on the steady-state capital-labor ratio?',
    options: [
      'The capital-labor ratio will increase due to higher labor input.',
      'The steady-state capital-labor ratio will decrease as capital is spread over more workers.',
      'The growth rate of output per worker will increase permanently.',
      'The steady-state capital-labor ratio remains unaffected by population changes.',
    ],
  },
  // ...add more questions as needed
];

const totalQuestions = questions.length;

export default function ExamTaking() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(totalQuestions).fill(null));
  const [flagged, setFlagged] = useState<boolean[]>(Array(totalQuestions).fill(false));
  const navigate = useNavigate();

  const handleSelect = (idx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const handleFlag = () => {
    setFlagged((prev) => {
      const next = [...prev];
      next[current] = !next[current];
      return next;
    });
  };

  const goTo = (idx: number) => setCurrent(idx);

  const handleClear = () => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = null;
      return next;
    });
  };

  const handleNext = () => {
    if (current < totalQuestions - 1) setCurrent(current + 1);
  };

  const handleFinish = () => {
    // You can add logic to submit answers here
    navigate('/student/feedback-detail');
  };
  const handlePrev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  return (
    <DashboardLayout>
      <div className="flex gap-8">
        {/* Sidebar: Question Navigator */}
        <aside className="w-64 bg-card rounded-lg p-4 border border-border flex flex-col">
          <div className="mb-4">
            <div className="font-semibold">QUESTION NAVIGATOR</div>
            <div className="text-xs text-muted-foreground">Total Questions: {totalQuestions}</div>
            <div className="mt-2 mb-1 text-xs">PROGRESS</div>
            <div className="w-full h-2 bg-muted rounded-full mb-2">
              <div
                className="h-2 bg-primary rounded-full"
                style={{ width: `${(answers.filter((a) => a !== null).length / totalQuestions) * 100}%` }}
              />
            </div>
            <div className="text-xs text-primary font-semibold mb-2">
              {Math.round((answers.filter((a) => a !== null).length / totalQuestions) * 100)}%
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                className={`w-8 h-8 rounded border text-xs font-bold
                  ${answers[idx] !== null ? 'bg-green-100 border-green-400 text-green-700' : ''}
                  ${flagged[idx] ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : ''}
                  ${current === idx ? 'ring-2 ring-primary' : ''}
                `}
                onClick={() => goTo(idx)}
                title={`Go to question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1 text-xs mt-auto">
            <div><span className="inline-block w-3 h-3 bg-green-100 border border-green-400 mr-1 align-middle" /> Answered</div>
            <div><span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-400 mr-1 align-middle" /> Flagged</div>
            <div><span className="inline-block w-3 h-3 border mr-1 align-middle" /> Unanswered</div>
          </div>
        </aside>
        {/* Main Content: Question */}
        <main className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>
                QUESTION {String(current + 1).padStart(2, '0')} OF {totalQuestions}
              </CardTitle>
              <div className="text-2xl font-bold mt-2">{questions[current].title}</div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-muted-foreground">{questions[current].content}</div>
              <div className="flex flex-col gap-3 mb-6">
                {questions[current].options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`w-full text-left border rounded-lg px-4 py-3 font-medium transition
                      ${answers[current] === idx ? 'border-primary bg-primary/10' : 'border-border bg-background'}
                      hover:border-primary
                    `}
                    onClick={() => handleSelect(idx)}
                  >
                    <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}</span> {opt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <Button variant={flagged[current] ? 'destructive' : 'outline'} onClick={handleFlag}>
                  {flagged[current] ? 'Unflag' : 'Flag for Review'}
                </Button>
              </div>
              <Separator className="mb-4" />
              <div className="flex gap-2 justify-between">
                <Button variant="secondary" onClick={handlePrev} disabled={current === 0}>
                  Previous
                </Button>
                <Button variant="ghost" onClick={handleClear}>
                  Clear Selection
                </Button>
                {current === totalQuestions - 1 ? (
                  <Button onClick={handleFinish}>
                    Finish Exam
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Save & Continue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </DashboardLayout>
  );
}
