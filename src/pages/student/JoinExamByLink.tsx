import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Link2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

export default function JoinExamByLink() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError('Missing token');
        setLoading(false);
        return;
      }

      try {
        const info = await api.validateExamLink(token);
        setLinkInfo(info);
      } catch (err: any) {
        setError(err?.message || 'This link is invalid or expired');
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await api.joinExamByLink(token, { password });
      const joinUrl = res?.joinUrl || (linkInfo?.joinUrl as string);
      if (!joinUrl) {
        throw new Error('Join URL not available');
      }
      navigate(joinUrl);
    } catch (err: any) {
      if (String(err?.message || '').toLowerCase().includes('unauthorized')) {
        setError('Please sign in to continue.');
      } else {
        setError(err?.message || 'Cannot join exam with this link');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Join Exam
          </CardTitle>
          <CardDescription>
            {linkInfo?.examTitle || 'Exam access link'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!linkInfo ? (
            <p className="text-sm text-muted-foreground">Link is not available.</p>
          ) : (
            <>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Course: {linkInfo?.course?.code ? `${linkInfo.course.code} - ${linkInfo.course.name}` : linkInfo?.course?.name || '-'}</p>
                <p>Used: {linkInfo?.usedCount ?? 0}/{linkInfo?.maxUses ?? '∞'}</p>
                <p>Expires: {linkInfo?.expiresAt ? new Date(linkInfo.expiresAt).toLocaleString() : 'No expiry'}</p>
              </div>

              {linkInfo.requiresPassword && (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter link password" />
                </div>
              )}

              <Button className="w-full gap-2" disabled={submitting} onClick={handleJoin}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Join Exam
              </Button>

              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
