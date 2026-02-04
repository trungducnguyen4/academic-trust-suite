import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      // Navigate based on role (handled by auth context)
      const user = email.toLowerCase();
      if (user.includes('student')) {
        navigate('/student');
      } else if (user.includes('lecturer')) {
        navigate('/lecturer');
      } else if (user.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-foreground mb-8">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">ExamTrust</span>
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-8">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your examination portal
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/reset-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Demo credentials:
            </p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between px-3 py-2 rounded-md bg-secondary/50">
                <span>Student:</span>
                <code>student@university.edu</code>
              </div>
              <div className="flex justify-between px-3 py-2 rounded-md bg-secondary/50">
                <span>Lecturer:</span>
                <code>lecturer@university.edu</code>
              </div>
              <div className="flex justify-between px-3 py-2 rounded-md bg-secondary/50">
                <span>Admin:</span>
                <code>admin@university.edu</code>
              </div>
              <p className="text-center pt-2">Password: <code>password123</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Visual */}
      <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-md text-primary-foreground">
          <blockquote className="text-2xl font-medium leading-relaxed">
            "ExamTrust has transformed how we approach academic assessments. 
            The transparency it provides builds confidence in our examination process."
          </blockquote>
          <div className="mt-6">
            <p className="font-medium">Dr. Maria Santos</p>
            <p className="text-primary-foreground/70 text-sm">Dean of Engineering, State University</p>
          </div>
        </div>
      </div>
    </div>
  );
}
