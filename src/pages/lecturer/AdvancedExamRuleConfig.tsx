import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Settings2,
  Shuffle,
  Shield,
  Globe,
  Timer,
  Eye,
  Wifi,
  WifiOff,
  BarChart3,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";
import { getNumericInputError, sanitizeNumericInput } from "@/lib/number-input";

export default function AdvancedExamRuleConfig() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Difficulty Distribution
  const [easyRatio, setEasyRatio] = useState([30]);
  const [mediumRatio, setMediumRatio] = useState([50]);
  const [hardRatio, setHardRatio] = useState([20]);

  // Exam Settings
  const [duration, setDuration] = useState("120");
  const [totalQuestions, setTotalQuestions] = useState("40");
  const [passingScore, setPassingScore] = useState("50");

  // Shuffle Settings
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [shuffleMode, setShuffleMode] = useState("random");

  // Security / Integrity
  const [fullscreenRequired, setFullscreenRequired] = useState(true);
  const [tabSwitchDetection, setTabSwitchDetection] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState([3]);
  const [mouseTracking, setMouseTracking] = useState(true);
  const [ipRestriction, setIpRestriction] = useState(false);
  const [allowedIpRange, setAllowedIpRange] = useState("192.168.1.0/24");

  // Scoring
  const [immediateScoring, setImmediateScoring] = useState(true);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkPercent, setNegativeMarkPercent] = useState([25]);

  // Offline Mode
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineEncryption, setOfflineEncryption] = useState(true);

  // Auto Submit
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [gracePeriod, setGracePeriod] = useState("5");

  const [numberErrors, setNumberErrors] = useState<Record<string, string>>({});

  // AI Integrity
  const [similarityThreshold, setSimilarityThreshold] = useState([80]);
  const [timingAnomalyThreshold, setTimingAnomalyThreshold] = useState([3]);

  const handleSave = async () => {
    const nextErrors = {
      duration:
        getNumericInputError(duration, { min: 10, max: 300, integer: true }) ||
        "",
      totalQuestions:
        getNumericInputError(totalQuestions, {
          min: 1,
          max: 200,
          integer: true,
        }) || "",
      passingScore:
        getNumericInputError(passingScore, {
          min: 0,
          max: 100,
          integer: true,
        }) || "",
      gracePeriod:
        getNumericInputError(gracePeriod, {
          min: 0,
          max: 30,
          integer: true,
        }) || "",
    };
    setNumberErrors(nextErrors);

    const firstError = Object.values(nextErrors).find(Boolean);
    if (firstError) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <BackToDashboardButton to="/lecturer" className="mb-4 -ml-2" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Exam Rule Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure difficulty distribution, shuffling, integrity, and
              scoring rules
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved!" : "Save Configuration"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Exam Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Basic Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={duration}
                    onChange={(e) => setDuration(sanitizeNumericInput(e.target.value))}
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        duration:
                          getNumericInputError(e.target.value, {
                            min: 10,
                            max: 300,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.duration ? (
                    <p className="text-xs text-destructive">{numberErrors.duration}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Total Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={totalQuestions}
                    onChange={(e) =>
                      setTotalQuestions(sanitizeNumericInput(e.target.value))
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        totalQuestions:
                          getNumericInputError(e.target.value, {
                            min: 1,
                            max: 200,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.totalQuestions ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.totalQuestions}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Passing Score (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) =>
                      setPassingScore(sanitizeNumericInput(e.target.value))
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        passingScore:
                          getNumericInputError(e.target.value, {
                            min: 0,
                            max: 100,
                            integer: true,
                          }) || "",
                      }))
                    }
                  />
                  {numberErrors.passingScore ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.passingScore}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Difficulty Distribution
              </CardTitle>
              <CardDescription>
                Allocate percentage of questions by difficulty level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Easy</span>
                    <span>{easyRatio[0]}%</span>
                  </div>
                  <Slider
                    value={easyRatio}
                    onValueChange={setEasyRatio}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600 font-medium">Medium</span>
                    <span>{mediumRatio[0]}%</span>
                  </div>
                  <Slider
                    value={mediumRatio}
                    onValueChange={setMediumRatio}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium">Hard</span>
                    <span>{hardRatio[0]}%</span>
                  </div>
                  <Slider
                    value={hardRatio}
                    onValueChange={setHardRatio}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <div className="flex-1">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500"
                      style={{ width: `${easyRatio[0]}%` }}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${mediumRatio[0]}%` }}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${hardRatio[0]}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${easyRatio[0] + mediumRatio[0] + hardRatio[0] === 100 ? "text-green-600" : "text-red-600"}`}
                >
                  Total: {easyRatio[0] + mediumRatio[0] + hardRatio[0]}%
                  {easyRatio[0] + mediumRatio[0] + hardRatio[0] !== 100 &&
                    " (must be 100%)"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shuffle Algorithm */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shuffle className="h-4 w-4" /> Shuffle Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Shuffle Questions</Label>
                  <p className="text-xs text-muted-foreground">
                    Randomize question order for each student
                  </p>
                </div>
                <Switch
                  checked={shuffleQuestions}
                  onCheckedChange={setShuffleQuestions}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Shuffle Answer Options</Label>
                  <p className="text-xs text-muted-foreground">
                    Randomize option order within each question
                  </p>
                </div>
                <Switch
                  checked={shuffleOptions}
                  onCheckedChange={setShuffleOptions}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Shuffle Mode</Label>
                <Select value={shuffleMode} onValueChange={setShuffleMode}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Fully Random</SelectItem>
                    <SelectItem value="by_topic">
                      Group by Topic, Shuffle Within
                    </SelectItem>
                    <SelectItem value="by_difficulty">
                      Order by Difficulty (easy → hard)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Security & Integrity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Security & Integrity
              </CardTitle>
              <CardDescription>
                Anti-cheating and proctoring measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Fullscreen Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Force fullscreen mode during exam
                  </p>
                </div>
                <Switch
                  checked={fullscreenRequired}
                  onCheckedChange={setFullscreenRequired}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tab Switch Detection</Label>
                  <p className="text-xs text-muted-foreground">
                    Detect and log when students switch tabs
                  </p>
                </div>
                <Switch
                  checked={tabSwitchDetection}
                  onCheckedChange={setTabSwitchDetection}
                />
              </div>
              {tabSwitchDetection && (
                <div className="ml-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Max allowed tab switches before auto-flag</span>
                    <span className="font-medium">{maxTabSwitches[0]}</span>
                  </div>
                  <Slider
                    value={maxTabSwitches}
                    onValueChange={setMaxTabSwitches}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mouse Movement Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Track cursor patterns for anomaly detection
                  </p>
                </div>
                <Switch
                  checked={mouseTracking}
                  onCheckedChange={setMouseTracking}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> IP Address Restriction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only allow exam from specific IP range
                  </p>
                </div>
                <Switch
                  checked={ipRestriction}
                  onCheckedChange={setIpRestriction}
                />
              </div>
              {ipRestriction && (
                <div className="ml-4 space-y-2">
                  <Label>Allowed IP Range (CIDR)</Label>
                  <Input
                    value={allowedIpRange}
                    onChange={(e) => setAllowedIpRange(e.target.value)}
                    placeholder="e.g., 192.168.1.0/24"
                    className="w-[280px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Integrity Thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> AI Integrity Thresholds
              </CardTitle>
              <CardDescription>
                Configure automatic cheating detection parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Answer Similarity Threshold</span>
                  <span className="font-medium">{similarityThreshold[0]}%</span>
                </div>
                <Slider
                  value={similarityThreshold}
                  onValueChange={setSimilarityThreshold}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Flag when answers between students are more than{" "}
                  {similarityThreshold[0]}% similar
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Timing Anomaly Threshold</span>
                  <span className="font-medium">
                    {timingAnomalyThreshold[0]} occurrences
                  </span>
                </div>
                <Slider
                  value={timingAnomalyThreshold}
                  onValueChange={setTimingAnomalyThreshold}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Flag when student has more than {timingAnomalyThreshold[0]}{" "}
                  timing anomalies
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Scoring Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Immediate Scoring</Label>
                  <p className="text-xs text-muted-foreground">
                    Show score immediately after submission
                  </p>
                </div>
                <Switch
                  checked={immediateScoring}
                  onCheckedChange={setImmediateScoring}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Correct Answers</Label>
                  <p className="text-xs text-muted-foreground">
                    Reveal correct answers after submission
                  </p>
                </div>
                <Switch
                  checked={showCorrectAnswer}
                  onCheckedChange={setShowCorrectAnswer}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Negative Marking</Label>
                  <p className="text-xs text-muted-foreground">
                    Deduct marks for incorrect answers
                  </p>
                </div>
                <Switch
                  checked={negativeMarking}
                  onCheckedChange={setNegativeMarking}
                />
              </div>
              {negativeMarking && (
                <div className="ml-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Penalty per wrong answer</span>
                    <span className="font-medium">
                      {negativeMarkPercent[0]}% of question value
                    </span>
                  </div>
                  <Slider
                    value={negativeMarkPercent}
                    onValueChange={setNegativeMarkPercent}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offline & Auto Submit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <WifiOff className="h-4 w-4" /> Offline & Auto-Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Offline Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow exam to be taken without internet
                  </p>
                </div>
                <Switch
                  checked={offlineMode}
                  onCheckedChange={setOfflineMode}
                />
              </div>
              {offlineMode && (
                <div className="ml-4 flex items-center justify-between">
                  <div>
                    <Label>AES-256 Encryption</Label>
                    <p className="text-xs text-muted-foreground">
                      Encrypt protected exam session data
                    </p>
                  </div>
                  <Switch
                    checked={offlineEncryption}
                    onCheckedChange={setOfflineEncryption}
                  />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Submit on Timeout</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically submit when time runs out
                  </p>
                </div>
                <Switch checked={autoSubmit} onCheckedChange={setAutoSubmit} />
              </div>
              {autoSubmit && (
                <div className="ml-4 space-y-2">
                  <Label>Grace Period (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={gracePeriod}
                    onChange={(e) =>
                      setGracePeriod(sanitizeNumericInput(e.target.value))
                    }
                    onBlur={(e) =>
                      setNumberErrors((prev) => ({
                        ...prev,
                        gracePeriod:
                          getNumericInputError(e.target.value, {
                            min: 0,
                            max: 30,
                            integer: true,
                          }) || "",
                      }))
                    }
                    className="w-24"
                  />
                  {numberErrors.gracePeriod ? (
                    <p className="text-xs text-destructive">
                      {numberErrors.gracePeriod}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Extra minutes before auto-submit after timer ends
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
