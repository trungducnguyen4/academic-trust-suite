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
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Explainable AI',
    description: 'Every decision and score is backed by clear, understandable reasoning that students and educators can review.',
  },
  {
    icon: Scale,
    title: 'Fair Assessment',
    description: 'Adaptive testing ensures every student is assessed appropriately, with bias detection built into the core system.',
  },
  {
    icon: Shield,
    title: 'Integrity Guard',
    description: 'Academic integrity monitoring with transparent flagging and human-in-the-loop verification processes.',
  },
  {
    icon: Lightbulb,
    title: 'Deep Insights',
    description: 'Post-exam analytics provide actionable learning insights for students and curriculum feedback for educators.',
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
      <section className="py-24 md:py-36 lg:py-44">
        <div className="container">
            <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-foreground text-balance">
              Examinations Built on Trust & Transparency
            </h1>
            
            <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto leading-relaxed">
              A modern examination system designed for academic integrity. 
              Explainable AI, fair adaptive testing, and complete transparency 
              for students and educators alike.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base gap-2">
                <Link to="/login">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link to="/login">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border">
        <div className="container py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
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
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Designed for Academic Excellence
            </h2>
            <p className="text-muted-foreground text-lg">
              Every feature is designed with academic integrity and student success in mind.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-interactive p-6 rounded-lg shadow-soft"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
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
      <section className="border-y border-border bg-muted/30">
        <div className="container py-12">
          <p className="text-center text-sm text-muted-foreground font-medium mb-6 uppercase tracking-wider">
            Trusted by leading institutions
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
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Ready to Transform Your Assessments?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
              Join leading universities in delivering fair, transparent, and trustworthy examinations.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base gap-2">
                <Link to="/login">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link to="/login">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-foreground text-sm">ExamTrust</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 ExamTrust. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
