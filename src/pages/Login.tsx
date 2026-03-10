import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
          </div>
          <span className="text-base">ExamTrust</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to home
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className="bg-card border border-border rounded-lg p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">ExamTrust</span>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Sign in to your account
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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

              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
              </p>

              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Need an account?{' '}
                <a href="#" className="text-primary hover:underline font-medium">Sign up</a>
              </p>
              <Link to="/reset-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 bg-card border border-border rounded-lg p-5">
            <p className="text-xs text-muted-foreground font-medium text-center mb-3 uppercase tracking-wider">
              Demo Accounts
            </p>
            <div className="space-y-2">
              {[
                { role: 'Student', email: 'student@examtrust.edu' },
                { role: 'Lecturer', email: 'lecturer@examtrust.edu' },
                { role: 'Admin', email: 'admin@examtrust.edu' },
              ].map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => { setEmail(demo.email); setPassword('123456'); }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">{demo.role}</span>
                    <code className="text-muted-foreground group-hover:text-foreground transition-colors text-xs">{demo.email}</code>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              ))}
              <p className="text-center text-xs text-muted-foreground pt-1">
                Password: <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">123456</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Product</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Sign Up</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Legal</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Support</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Connect</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2024 ExamTrust. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
