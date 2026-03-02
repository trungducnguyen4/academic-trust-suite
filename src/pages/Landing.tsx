import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { 
  Shield, 
  BarChart3, 
  Eye, 
  ArrowRight,
  GraduationCap,
  Lightbulb,
  Scale,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Explainable AI',
    description: 'Every decision and score is backed by clear, understandable reasoning that students and educators can review.',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: Scale,
    title: 'Fair Assessment',
    description: 'Adaptive testing ensures every student is assessed appropriately, with bias detection built into the core system.',
    gradient: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-500/10',
  },
  {
    icon: Shield,
    title: 'Integrity Guard',
    description: 'Academic integrity monitoring with transparent flagging and human-in-the-loop verification processes.',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Deep Insights',
    description: 'Post-exam analytics provide actionable learning insights for students and curriculum feedback for educators.',
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
  },
];

const stats = [
  { value: '99.2%', label: 'System Reliability', icon: Zap },
  { value: '50K+', label: 'Exams Administered', icon: BarChart3 },
  { value: '15+', label: 'Partner Universities', icon: GraduationCap },
  { value: '<0.1%', label: 'False Positive Rate', icon: Shield },
];

const trustedBy = [
  'Stanford University',
  'MIT',
  'Oxford University',
  'ETH Zürich',
  'National University of Singapore',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="blob absolute top-20 left-[15%] w-[400px] h-[400px] bg-primary/20" />
          <div className="blob absolute top-40 right-[15%] w-[350px] h-[350px] bg-accent/20" style={{ animationDelay: '2s' }} />
          <div className="blob absolute bottom-20 left-[40%] w-[300px] h-[300px] bg-info/15" style={{ animationDelay: '4s' }} />
        </div>
        <div className="surface-grid absolute inset-0 opacity-30" />
        
        <div className="container relative py-24 md:py-36 lg:py-44">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI-Powered Academic Platform
              <ChevronRight className="h-3 w-3" />
            </div>
            
            {/* Headline */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-balance animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
              Examinations Built on{' '}
              <span className="text-gradient-hero">Trust & Transparency</span>
            </h1>
            
            {/* Subheadline */}
            <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s' }}>
              A modern examination system designed for academic integrity. 
              Explainable AI, fair adaptive testing, and complete transparency 
              for students and educators alike.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
              <Button asChild size="lg" className="h-12 px-8 text-base gap-2 shadow-glow-blue shine rounded-xl">
                <Link to="/login">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base rounded-xl">
                <Link to="/login">Watch Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-y border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-accent/[0.03]" />
        <div className="container relative py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={stat.label} className={`text-center animate-fade-in-up opacity-0 stagger-${i + 1}`}>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground font-medium">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Core Principles
            </div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Designed for{' '}
              <span className="text-gradient-hero">Academic Excellence</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Every feature is designed with academic integrity and student success in mind.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group card-interactive p-6 bg-gradient-to-br ${feature.gradient} animate-fade-in-up opacity-0 stagger-${i + 1}`}
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container py-12">
          <p className="text-center text-sm text-muted-foreground font-medium mb-6">
            TRUSTED BY LEADING INSTITUTIONS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {trustedBy.map((name) => (
              <span key={name} className="text-muted-foreground/60 font-semibold text-lg hover:text-muted-foreground transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="blob absolute top-10 right-[20%] w-[300px] h-[300px] bg-primary/15" />
          <div className="blob absolute bottom-10 left-[20%] w-[250px] h-[250px] bg-accent/15" style={{ animationDelay: '3s' }} />
        </div>
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Ready to Transform Your Assessments?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
              Join leading universities in delivering fair, transparent, and trustworthy examinations.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base gap-2 shadow-glow-blue shine rounded-xl">
                <Link to="/login">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base rounded-xl">
                <Link to="/login">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/20 py-10">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-semibold text-foreground">ExamTrust</span>
              <span className="text-sm text-muted-foreground">© 2024</span>
            </div>
            <nav className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-medium">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Docs</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Support</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
