import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';
import {
  Link2,
  QrCode,
  ShieldCheck,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Mail,
} from 'lucide-react';

type JoinStep = 'enter-code' | 'verify-email' | 'confirmed';

export default function JoinExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [examCode, setExamCode] = useState(initialCode);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<JoinStep>('enter-code');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock exam info returned after code validation
  const [examInfo, setExamInfo] = useState<{
    title: string;
    course: string;
    instructor: string;
    scheduledAt: string;
    duration: number;
    totalQuestions: number;
  } | null>(null);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call to validate exam code
    await new Promise((r) => setTimeout(r, 1200));

    if (!examCode.trim()) {
      setError('Please enter an exam code or link.');
      setIsLoading(false);
      return;
    }

    // Mock: simulate valid code
    setExamInfo({
      title: 'Advanced Algorithms — Midterm Exam',
      course: 'CS301',
      instructor: 'Dr. Nguyen Van A',
      scheduledAt: '2026-02-25T09:00:00',
      duration: 120,
      totalQuestions: 45,
    });
    setStep('verify-email');
    setIsLoading(false);
  };

  const handleSendOtp = async () => {
    setError('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    // Mock: OTP sent
    setIsLoading(false);
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    if (otp !== '123456') {
      setError('Invalid OTP. Please check your email and try again.');
      setIsLoading(false);
      return;
    }

    setStep('confirmed');
    setIsLoading(false);
  };

  const handleProceed = () => {
    navigate('/student/exam-ready');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <BackToDashboardButton to="/student" className="mb-4 -ml-2" />

        <h1 className="text-2xl font-semibold text-foreground mb-1">Join Exam</h1>
        <p className="text-muted-foreground mb-6">
          Enter your exam code or invitation link to join an examination session
        </p>

        {/* Step indicators */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { key: 'enter-code', label: 'Enter Code', num: 1 },
            { key: 'verify-email', label: 'Verify Email', num: 2 },
            { key: 'confirmed', label: 'Confirmed', num: 3 },
          ].map((s, idx) => {
            const isActive = s.key === step;
            const isDone =
              (s.key === 'enter-code' && (step === 'verify-email' || step === 'confirmed')) ||
              (s.key === 'verify-email' && step === 'confirmed');
            return (
              <div key={s.key} className="flex items-center gap-2">
                {idx > 0 && <div className={`h-px w-8 ${isDone || isActive ? 'bg-primary' : 'bg-border'}`} />}
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-sm ${isActive || isDone ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Enter Exam Code */}
        {step === 'enter-code' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Enter Exam Code
              </CardTitle>
              <CardDescription>
                Paste your exam invitation link or enter the exam code provided by your instructor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="examCode">Exam Code or Link</Label>
                  <Input
                    id="examCode"
                    placeholder="e.g., EX-2026-CS301-MID or https://examtrust.edu/join/..."
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    className="h-11 font-mono"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Validate & Continue
                </Button>
              </form>

              <Separator className="my-6" />

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Or scan a QR code</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/student/scan-qr')}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Open QR Scanner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Email Enrollment */}
        {step === 'verify-email' && examInfo && (
          <div className="space-y-4">
            {/* Exam Info Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Exam Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Title</p>
                    <p className="font-medium">{examInfo.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Course</p>
                    <p className="font-medium">{examInfo.course}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Instructor</p>
                    <p className="font-medium">{examInfo.instructor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="font-medium">{new Date(examInfo.scheduledAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {examInfo.duration} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Questions</p>
                    <p className="font-medium">{examInfo.totalQuestions} items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Verify Your Enrollment
                </CardTitle>
                <CardDescription>
                  Enter your university email to verify you are enrolled in this exam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">University Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={handleSendOtp} disabled={isLoading || !email}>
                        Send OTP
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="font-mono tracking-widest"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      A verification code has been sent to your email
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Verify & Enroll
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Confirmed */}
        {step === 'confirmed' && examInfo && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Enrollment Confirmed!</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You have been successfully enrolled in <strong>{examInfo.title}</strong>.
                The exam is scheduled for{' '}
                <strong>{new Date(examInfo.scheduledAt).toLocaleString()}</strong>.
              </p>
              <div className="flex items-center justify-center gap-3 mb-6">
                <StatusBadge variant="success">Enrolled</StatusBadge>
                <StatusBadge variant="info">{examInfo.course}</StatusBadge>
                <StatusBadge variant="default">{examInfo.duration} min</StatusBadge>
              </div>
              <Button onClick={handleProceed} size="lg" className="gap-2">
                Proceed to Exam Ready Check
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
