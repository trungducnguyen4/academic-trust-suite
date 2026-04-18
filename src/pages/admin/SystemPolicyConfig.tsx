import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Shield,
  Eye,
  Lock,
  Globe,
  Bell,
  Database,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { getNumericInputError, sanitizeNumericInput } from "@/lib/number-input";

export default function SystemPolicyConfig() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Integrity Policies
  const [globalSimilarityThreshold, setGlobalSimilarityThreshold] = useState([
    80,
  ]);
  const [globalTimingThreshold, setGlobalTimingThreshold] = useState([3]);
  const [autoFlagEnabled, setAutoFlagEnabled] = useState(true);
  const [requireManualReview, setRequireManualReview] = useState(true);
  const [maxTabSwitchesGlobal, setMaxTabSwitchesGlobal] = useState([5]);

  // Scoring Policies
  const [defaultPassingScore, setDefaultPassingScore] = useState("50");
  const [allowNegativeMarking, setAllowNegativeMarking] = useState(false);
  const [scoreRoundingMethod, setScoreRoundingMethod] = useState("round");
  const [gradeScale, setGradeScale] = useState("10");

  // Access Policies
  const [passwordPolicy, setPasswordPolicy] = useState("strong");
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("");

  // Data Retention
  const [retentionPeriod, setRetentionPeriod] = useState("365");
  const [autoArchive, setAutoArchive] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");

  // Notification Policies
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [integrityAlertEmail, setIntegrityAlertEmail] = useState(true);
  const [examReminderHours, setExamReminderHours] = useState("24");

  const [numberErrors, setNumberErrors] = useState<Record<string, string>>({});

  // System Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const handleSave = async () => {
    const nextErrors = {
      defaultPassingScore:
        getNumericInputError(defaultPassingScore, {
          min: 0,
          max: 100,
          integer: true,
        }) || "",
      sessionTimeout:
        getNumericInputError(sessionTimeout, {
          min: 5,
          max: 480,
          integer: true,
        }) || "",
      maxLoginAttempts:
        getNumericInputError(maxLoginAttempts, {
          min: 1,
          max: 20,
          integer: true,
        }) || "",
      examReminderHours:
        getNumericInputError(examReminderHours, {
          min: 1,
          max: 72,
          integer: true,
        }) || "",
    };

    setNumberErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setGlobalSimilarityThreshold([80]);
    setGlobalTimingThreshold([3]);
    setAutoFlagEnabled(true);
    setRequireManualReview(true);
    setMaxTabSwitchesGlobal([5]);
    setDefaultPassingScore("50");
    setAllowNegativeMarking(false);
  };

  return (
    <DashboardLayout>
      <AdminPageShell>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              System Policy Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure global integrity thresholds, scoring policies, and
              system settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved!" : "Save Policies"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Integrity Thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Global Integrity Thresholds
              </CardTitle>
              <CardDescription>
                System-wide settings for cheating detection and flagging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Answer Similarity Threshold</span>
                  <span className="font-medium">
                    {globalSimilarityThreshold[0]}%
                  </span>
                </div>
                <Slider
                  value={globalSimilarityThreshold}
                  onValueChange={setGlobalSimilarityThreshold}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Flag submissions when answer similarity exceeds this value
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Timing Anomaly Threshold</span>
                  <span className="font-medium">
                    {globalTimingThreshold[0]} events
                  </span>
                </div>
                <Slider
                  value={globalTimingThreshold}
                  onValueChange={setGlobalTimingThreshold}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Max Tab Switches Before Auto-Flag</span>
                  <span className="font-medium">{maxTabSwitchesGlobal[0]}</span>
                </div>
                <Slider
                  value={maxTabSwitchesGlobal}
                  onValueChange={setMaxTabSwitchesGlobal}
                  min={1}
                  max={15}
                  step={1}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Flagging</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically flag submissions that exceed thresholds
                  </p>
                </div>
                <Switch
                  checked={autoFlagEnabled}
                  onCheckedChange={setAutoFlagEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Manual Review</Label>
                  <p className="text-xs text-muted-foreground">
                    All flagged cases must be reviewed by an instructor
                  </p>
                </div>
                <Switch
                  checked={requireManualReview}
                  onCheckedChange={setRequireManualReview}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scoring Policies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Scoring Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Passing Score (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={defaultPassingScore}
                    onChange={(e) =>
                      setDefaultPassingScore(
                        sanitizeNumericInput(e.target.value),
                      )
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        defaultPassingScore:
                          getNumericInputError(e.target.value, {
                            min: 0,
                            max: 100,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.defaultPassingScore ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.defaultPassingScore}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Grade Scale</Label>
                  <Select value={gradeScale} onValueChange={setGradeScale}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10-point scale</SelectItem>
                      <SelectItem value="100">100-point scale</SelectItem>
                      <SelectItem value="letter">Letter grade (A-F)</SelectItem>
                      <SelectItem value="4">4.0 GPA scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Score Rounding Method</Label>
                <Select
                  value={scoreRoundingMethod}
                  onValueChange={setScoreRoundingMethod}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Round to nearest</SelectItem>
                    <SelectItem value="floor">Round down (floor)</SelectItem>
                    <SelectItem value="ceil">Round up (ceiling)</SelectItem>
                    <SelectItem value="none">
                      No rounding (2 decimals)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Negative Marking</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable instructors to configure negative scoring per exam
                  </p>
                </div>
                <Switch
                  checked={allowNegativeMarking}
                  onCheckedChange={setAllowNegativeMarking}
                />
              </div>
            </CardContent>
          </Card>

          {/* Access & Security */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Access & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Password Policy</Label>
                  <Select
                    value={passwordPolicy}
                    onValueChange={setPasswordPolicy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (6+ chars)</SelectItem>
                      <SelectItem value="medium">Medium (8+ mixed)</SelectItem>
                      <SelectItem value="strong">
                        Strong (12+ mixed + special)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session Timeout (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={sessionTimeout}
                    onChange={(e) =>
                      setSessionTimeout(sanitizeNumericInput(e.target.value))
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        sessionTimeout:
                          getNumericInputError(e.target.value, {
                            min: 5,
                            max: 480,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.sessionTimeout ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.sessionTimeout}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={maxLoginAttempts}
                    onChange={(e) =>
                      setMaxLoginAttempts(sanitizeNumericInput(e.target.value))
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        maxLoginAttempts:
                          getNumericInputError(e.target.value, {
                            min: 1,
                            max: 20,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.maxLoginAttempts ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.maxLoginAttempts}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    Require 2FA for all users
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label>IP Whitelist (optional)</Label>
                <Textarea
                  placeholder="Enter allowed IP ranges, one per line (e.g., 192.168.1.0/24)"
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" /> Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Retention Period</Label>
                  <Select
                    value={retentionPeriod}
                    onValueChange={setRetentionPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">6 months</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select
                    value={backupFrequency}
                    onValueChange={setBackupFrequency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Archive Completed Exams</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically archive exams after retention period
                  </p>
                </div>
                <Switch
                  checked={autoArchive}
                  onCheckedChange={setAutoArchive}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notification Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Send system notifications via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Integrity Alert Emails</Label>
                  <p className="text-xs text-muted-foreground">
                    Send email alerts when integrity issues are detected
                  </p>
                </div>
                <Switch
                  checked={integrityAlertEmail}
                  onCheckedChange={setIntegrityAlertEmail}
                />
              </div>
              <div className="space-y-2">
                <Label>Exam Reminder (hours before)</Label>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={examReminderHours}
                  onChange={(e) =>
                    setExamReminderHours(sanitizeNumericInput(e.target.value))
                  }
                  onBlur={(e) =>
                    setNumberErrors((prev) => ({
                      ...prev,
                      examReminderHours:
                        getNumericInputError(e.target.value, {
                          min: 1,
                          max: 72,
                          integer: true,
                        }) || "",
                    }))
                  }
                  className="w-24"
                />
                {numberErrors.examReminderHours ? (
                  <p className="text-xs text-destructive">
                    {numberErrors.examReminderHours}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> System Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Disable access for non-admin users
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
              {maintenanceMode && (
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    placeholder="Message to display to users..."
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminPageShell>
    </DashboardLayout>
  );
}
