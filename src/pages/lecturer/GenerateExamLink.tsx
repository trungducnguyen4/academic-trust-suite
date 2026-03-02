import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Link2,
  QrCode,
  Mail,
  Copy,
  CheckCircle2,
  Clock,
  Users,
  Send,
  Loader2,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface ExamLink {
  id: string;
  code: string;
  url: string;
  exam: string;
  createdAt: string;
  expiresAt: string;
  usageCount: number;
  maxUsage: number;
  status: 'active' | 'expired' | 'disabled';
}

interface SentInvitation {
  email: string;
  sentAt: string;
  opened: boolean;
  joined: boolean;
}

const mockLinks: ExamLink[] = [
  {
    id: '1', code: 'EX-2026-A3F8', url: 'https://exam.university.edu/join/EX-2026-A3F8',
    exam: 'Data Structures Final', createdAt: '2026-01-12', expiresAt: '2026-01-15',
    usageCount: 32, maxUsage: 60, status: 'active',
  },
  {
    id: '2', code: 'EX-2026-B7K2', url: 'https://exam.university.edu/join/EX-2026-B7K2',
    exam: 'Algorithms Midterm', createdAt: '2026-01-05', expiresAt: '2026-01-08',
    usageCount: 48, maxUsage: 50, status: 'expired',
  },
];

const mockInvitations: SentInvitation[] = [
  { email: 'student1@university.edu', sentAt: '2026-01-12 10:00', opened: true, joined: true },
  { email: 'student2@university.edu', sentAt: '2026-01-12 10:00', opened: true, joined: false },
  { email: 'student3@university.edu', sentAt: '2026-01-12 10:01', opened: false, joined: false },
];

export default function GenerateExamLink() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ExamLink[]>(mockLinks);
  const [invitations, setInvitations] = useState<SentInvitation[]>(mockInvitations);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);

  // New link form
  const [selectedExam, setSelectedExam] = useState('');
  const [maxUsage, setMaxUsage] = useState(60);
  const [expiryHours, setExpiryHours] = useState(72);

  // Email form
  const [emailList, setEmailList] = useState('');
  const [emailLinkId, setEmailLinkId] = useState('');

  const generateLink = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const code = `EX-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newLink: ExamLink = {
      id: String(links.length + 1),
      code,
      url: `https://exam.university.edu/join/${code}`,
      exam: selectedExam || 'New Exam',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + expiryHours * 3600000).toISOString().split('T')[0],
      usageCount: 0,
      maxUsage,
      status: 'active',
    };
    setLinks([newLink, ...links]);
    setGenerating(false);
  };

  const copyLink = (link: ExamLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendEmails = async () => {
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    const emails = emailList.split(/[\n,;]/).map((e) => e.trim()).filter(Boolean);
    const newInvites: SentInvitation[] = emails.map((email) => ({
      email,
      sentAt: new Date().toLocaleString(),
      opened: false,
      joined: false,
    }));
    setInvitations([...newInvites, ...invitations]);
    setEmailList('');
    setSending(false);
  };

  const disableLink = (id: string) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, status: 'disabled' as const } : l)));
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost" size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate('/lecturer')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Generate Exam Link & Invitations</h1>
          <p className="text-muted-foreground">
            Create shareable exam links, QR codes, and send email invitations to students
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Generate Link Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Generate New Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Data Structures Final">Data Structures Final</SelectItem>
                    <SelectItem value="Algorithms Midterm">Algorithms Midterm</SelectItem>
                    <SelectItem value="OS Quiz 3">OS Quiz 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Max Usage</Label>
                  <Input type="number" min={1} value={maxUsage} onChange={(e) => setMaxUsage(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Expires in (hours)</Label>
                  <Input type="number" min={1} value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={generateLink} disabled={generating || !selectedExam} className="w-full gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Generate Link
              </Button>
            </CardContent>
          </Card>

          {/* Send Email Invitations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Exam Link</Label>
                <Select value={emailLinkId} onValueChange={setEmailLinkId}>
                  <SelectTrigger><SelectValue placeholder="Select link to send..." /></SelectTrigger>
                  <SelectContent>
                    {links.filter((l) => l.status === 'active').map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.exam} ({l.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <Textarea
                  placeholder="Enter emails separated by comma, semicolon, or new line..."
                  value={emailList}
                  onChange={(e) => setEmailList(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={sendEmails} disabled={sending || !emailLinkId || !emailList.trim()} className="w-full gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Invitations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Existing Links */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Generated Links</CardTitle>
            <CardDescription>All exam links and their usage statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.exam}</TableCell>
                    <TableCell className="font-mono text-sm">{link.code}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{link.createdAt}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{link.expiresAt}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{link.usageCount}</span>
                      <span className="text-muted-foreground">/{link.maxUsage}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={link.status === 'active' ? 'success' : link.status === 'expired' ? 'default' : 'destructive'}
                      >
                        {link.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="sm" title="Copy link"
                          onClick={() => copyLink(link)}
                        >
                          {copiedId === link.id ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm" title="Show QR"
                          onClick={() => setShowQR(showQR === link.id ? null : link.id)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {link.status === 'active' && (
                          <Button
                            variant="ghost" size="sm" title="Disable"
                            className="text-destructive"
                            onClick={() => disableLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* QR Code Preview (simulated) */}
            {showQR && (
              <div className="mt-4 p-6 border rounded-lg text-center">
                <div className="inline-flex items-center justify-center w-48 h-48 bg-muted rounded-lg mb-3">
                  <div className="text-center">
                    <QrCode className="h-20 w-20 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">QR Code</p>
                  </div>
                </div>
                <p className="text-sm font-mono text-muted-foreground">
                  {links.find((l) => l.id === showQR)?.url}
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Download QR
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitation Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invitation Tracking</CardTitle>
            <CardDescription>Monitor email delivery and student enrollment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xl font-semibold">{invitations.length}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xl font-semibold text-blue-600">{invitations.filter((i) => i.opened).length}</p>
                <p className="text-xs text-muted-foreground">Opened</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xl font-semibold text-green-600">{invitations.filter((i) => i.joined).length}</p>
                <p className="text-xs text-muted-foreground">Joined</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="text-center">Opened</TableHead>
                  <TableHead className="text-center">Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{inv.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.sentAt}</TableCell>
                    <TableCell className="text-center">
                      {inv.opened ? <CheckCircle2 className="h-4 w-4 text-blue-600 mx-auto" /> : <Clock className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {inv.joined ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <Clock className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-right">
                      {!inv.joined && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <RefreshCw className="h-3 w-3" /> Resend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
