import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle, ArrowRight, Shield, Eye, Lightbulb } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left panel – Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle background elements */}
        <div className="absolute inset-0 surface-grid opacity-20" />
        <div className="absolute top-20 -left-20 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-[200px] h-[200px] bg-accent/5 rounded-full blur-[80px]" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-12 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow-blue transition-shadow group-hover:shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">ExamTrust</span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your examination portal
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:bg-card transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link
                  to="/reset-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
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
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:bg-card transition-colors"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl text-base font-medium gap-2 shadow-glow-blue shine" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-10 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground font-medium text-center mb-4">
              Demo Accounts
            </p>
            <div className="space-y-2">
              {[
                { role: 'Student', email: 'student@examtrust.edu', color: 'bg-blue-500/10 text-blue-700' },
                { role: 'Lecturer', email: 'lecturer@examtrust.edu', color: 'bg-violet-500/10 text-violet-700' },
                { role: 'Admin', email: 'admin@examtrust.edu', color: 'bg-emerald-500/10 text-emerald-700' },
              ].map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => { setEmail(demo.email); setPassword('123456'); }}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border/50 transition-all text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${demo.color}`}>{demo.role}</span>
                    <code className="text-muted-foreground group-hover:text-foreground transition-colors">{demo.email}</code>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              ))}
              <p className="text-center text-xs text-muted-foreground pt-2">
                Password: <code className="bg-secondary px-1.5 py-0.5 rounded">123456</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – Visual */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
        <div className="absolute inset-0 opacity-10">
          <div className="surface-grid h-full" />
        </div>
        {/* Floating decorative elements */}
        <div className="absolute top-[15%] right-[10%] w-[200px] h-[200px] rounded-full bg-white/10 blur-[60px] animate-float" />
        <div className="absolute bottom-[20%] left-[10%] w-[150px] h-[150px] rounded-full bg-white/10 blur-[40px] animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative flex flex-col justify-center p-12 lg:p-16 z-10">
          <div className="max-w-md">
            <blockquote className="text-2xl lg:text-3xl font-semibold leading-relaxed text-white/95">
              "ExamTrust has transformed how we approach academic assessments with unprecedented transparency."
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <div>
                <p className="font-semibold text-white">Dr. Maria Santos</p>
                <p className="text-white/60 text-sm">Dean of Engineering, State University</p>
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-16 flex flex-wrap gap-3">
            {[
              { icon: Shield, label: 'Integrity Protected' },
              { icon: Eye, label: 'Transparent Scoring' },
              { icon: Lightbulb, label: 'AI-Powered Insights' },
            ].map((item) => (
              <div key={item.label} className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm text-white/80">
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
