import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { 
  Shield, 
  BarChart3, 
  Eye, 
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Lightbulb,
  Scale,
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Explainable',
    description: 'Every decision and score is backed by clear, understandable reasoning that students and educators can review.',
  },
  {
    icon: Scale,
    title: 'Fair',
    description: 'Adaptive testing ensures every student is assessed appropriately, with bias detection built into the core system.',
  },
  {
    icon: Shield,
    title: 'Trustable',
    description: 'Academic integrity monitoring with transparent flagging and human-in-the-loop verification processes.',
  },
  {
    icon: Lightbulb,
    title: 'Insightful',
    description: 'Post-exam analytics provide actionable learning insights for students and curriculum feedback for educators.',
  },
];

const stats = [
  { value: '99.2%', label: 'System Reliability' },
  { value: '50K+', label: 'Exams Administered' },
  { value: '15+', label: 'Partner Universities' },
  { value: '<0.1%', label: 'False Positive Rate' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              Academic Examination Platform
            </div>
            <h1 className="mb-6 text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
              Examinations Built on{' '}
              <span className="text-primary">Trust & Transparency</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              A modern examination system designed for academic integrity. 
              Explainable AI, fair adaptive testing, and complete transparency 
              for students and educators alike.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border bg-card">
        <div className="container py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-semibold text-foreground md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-semibold text-foreground md:text-4xl mb-4">
              Principles That Guide Us
            </h2>
            <p className="text-muted-foreground text-lg">
              Every feature is designed with academic integrity and student success in mind.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-foreground">
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

      {/* CTA Section */}
      <section className="border-t border-border bg-card">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl mb-4">
              Ready to Transform Your Assessments?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join leading universities in delivering fair, transparent, and trustworthy examinations.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/login">Start Free Trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>ExamTrust © 2024. All rights reserved.</span>
            </div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
