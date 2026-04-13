import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle2,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  Package,
  Shield,
} from 'lucide-react';
import { BackToDashboardButton } from '@/components/common/BackToDashboardButton';

interface OfflineExamPackage {
  id: string;
  title: string;
  course: string;
  scheduledAt: string;
  duration: number;
  totalQuestions: number;
  packageSize: string;
  downloadedAt?: string;
  status: 'available' | 'downloading' | 'downloaded' | 'expired';
}

const mockPackages: OfflineExamPackage[] = [
  {
    id: 'pkg-1',
    title: 'Advanced Algorithms — Midterm',
    course: 'CS301',
    scheduledAt: '2026-02-25T09:00:00',
    duration: 120,
    totalQuestions: 45,
    packageSize: '2.4 MB',
    status: 'available',
  },
  {
    id: 'pkg-2',
    title: 'Database Systems — Quiz 3',
    course: 'CS202',
    scheduledAt: '2026-02-26T14:00:00',
    duration: 45,
    totalQuestions: 20,
    packageSize: '1.1 MB',
    status: 'downloaded',
    downloadedAt: '2026-02-24T10:30:00',
  },
  {
    id: 'pkg-3',
    title: 'Operating Systems — Final',
    course: 'CS401',
    scheduledAt: '2026-02-20T09:00:00',
    duration: 180,
    totalQuestions: 60,
    packageSize: '3.8 MB',
    status: 'expired',
  },
];

export default function OfflineExamDownload() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<OfflineExamPackage[]>(mockPackages);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const handleDownload = async (pkgId: string) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === pkgId ? { ...p, status: 'downloading' } : p))
    );
    setDownloadProgress((prev) => ({ ...prev, [pkgId]: 0 }));

    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 300));
      setDownloadProgress((prev) => ({ ...prev, [pkgId]: i }));
    }

    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkgId
          ? { ...p, status: 'downloaded', downloadedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const handleDelete = (pkgId: string) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === pkgId ? { ...p, status: 'available', downloadedAt: undefined } : p))
    );
  };

  const downloadedCount = packages.filter((p) => p.status === 'downloaded').length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <BackToDashboardButton to="/student" className="mb-4 -ml-2" />

        <h1 className="text-2xl font-semibold text-foreground mb-1">Offline Exam Packages</h1>
        <p className="text-muted-foreground mb-6">
          Download exam packages for offline use. Answers will sync automatically when you reconnect.
        </p>

        {/* Storage summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{packages.filter((p) => p.status === 'available').length}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{downloadedCount}</p>
                  <p className="text-xs text-muted-foreground">Downloaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">AES-256</p>
                  <p className="text-xs text-muted-foreground">Encrypted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert className="mb-6">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Downloaded packages are encrypted and can only be unlocked at the scheduled exam time.
            Your answers will be stored locally and synced when connectivity is restored.
          </AlertDescription>
        </Alert>

        {/* Package list */}
        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={pkg.status === 'expired' ? 'opacity-60' : ''}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{pkg.title}</h3>
                      {pkg.status === 'downloaded' && (
                        <StatusBadge variant="success">Downloaded</StatusBadge>
                      )}
                      {pkg.status === 'expired' && (
                        <StatusBadge variant="destructive">Expired</StatusBadge>
                      )}
                      {pkg.status === 'downloading' && (
                        <StatusBadge variant="warning">Downloading...</StatusBadge>
                      )}
                      {pkg.status === 'available' && (
                        <StatusBadge variant="info">Available</StatusBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> {pkg.course}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {pkg.duration} min
                      </span>
                      <span>{pkg.totalQuestions} questions</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5" /> {pkg.packageSize}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled: {new Date(pkg.scheduledAt).toLocaleString()}
                    </p>
                    {pkg.downloadedAt && (
                      <p className="text-xs text-muted-foreground">
                        Downloaded: {new Date(pkg.downloadedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {pkg.status === 'available' && (
                      <Button size="sm" className="gap-2" onClick={() => handleDownload(pkg.id)}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                    {pkg.status === 'downloading' && (
                      <Button size="sm" disabled className="gap-2 min-w-[120px]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {downloadProgress[pkg.id] || 0}%
                      </Button>
                    )}
                    {pkg.status === 'downloaded' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDelete(pkg.id)}>
                          Remove
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => navigate('/student/exam-ready')}>
                          <CheckCircle2 className="h-4 w-4" />
                          Ready
                        </Button>
                      </div>
                    )}
                    {pkg.status === 'expired' && (
                      <StatusBadge variant="destructive">N/A</StatusBadge>
                    )}
                  </div>
                </div>

                {/* Download progress bar */}
                {pkg.status === 'downloading' && (
                  <div className="mt-3">
                    <Progress value={downloadProgress[pkg.id] || 0} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
