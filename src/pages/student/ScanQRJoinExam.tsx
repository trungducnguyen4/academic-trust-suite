import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  QrCode,
  Camera,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { BackToDashboardButton } from "@/components/common/BackToDashboardButton";

export default function ScanQRJoinExam() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  // Simulate camera permission check
  useEffect(() => {
    const checkCamera = async () => {
      try {
        // In real app: navigator.mediaDevices.getUserMedia({ video: true })
        await new Promise((r) => setTimeout(r, 600));
        setHasCamera(true);
      } catch {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  const startScanning = useCallback(() => {
    setScanning(true);
    setError("");

    // Try to use native BarcodeDetector if available
    const runCameraScan = async () => {
      try {
        if ((window as any).BarcodeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          const video = document.createElement("video");
          video.playsInline = true;
          video.srcObject = stream;
          await video.play();

          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });

          let stopped = false;

          const stopAll = () => {
            stopped = true;
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch (e) {}
            try {
              video.pause();
              video.srcObject = null;
            } catch (e) {}
            setScanning(false);
          };

          const scanFrame = async () => {
            if (stopped) return;
            try {
              const bitmap = await createImageBitmap(video);
              const codes = await detector.detect(bitmap);
              if (codes && codes.length) {
                setScannedCode(
                  codes[0].rawValue || codes[0].rawValue?.toString() || "",
                );
                stopAll();
                return;
              }
            } catch (err) {
              // ignore frame errors
            }
            requestAnimationFrame(scanFrame);
          };

          scanFrame();
          return;
        }
      } catch (err) {
        console.warn("Camera scan failed, falling back to simulated scan", err);
      }

      // Fallback: simulated scan
      setTimeout(() => {
        setScannedCode("EX-2026-CS301-MID");
        setScanning(false);
      }, 2500);
    };

    runCameraScan();
  }, []);

  const handleValidateCode = async (code: string) => {
    setError("");
    setIsValidating(true);
    await new Promise((r) => setTimeout(r, 1000));

    if (!code.trim()) {
      setError("Invalid code. Please try again.");
      setIsValidating(false);
      return;
    }

    // Mock validation success
    setValidated(true);
    setIsValidating(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidateCode(manualCode);
  };

  const handleProceed = () => {
    navigate(`/student/join-exam?code=${scannedCode || manualCode}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <BackToDashboardButton to="/student" className="mb-2 -ml-2" />

        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate("/student/join-exam")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Join Exam
        </Button>

        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Scan QR Code
        </h1>
        <p className="text-muted-foreground mb-6">
          Point your camera at the exam QR code to join automatically
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!validated ? (
          <div className="space-y-4">
            {/* Camera / QR Scanner Area */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  QR Scanner
                </CardTitle>
                <CardDescription>
                  Allow camera access to scan the QR code from your instructor
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Simulated camera viewfinder */}
                <div className="relative aspect-square max-h-80 mx-auto bg-secondary/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                  {hasCamera === null ? (
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Checking camera...
                      </p>
                    </div>
                  ) : hasCamera === false ? (
                    <div className="text-center p-6">
                      <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Camera not available
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please allow camera access or enter the code manually
                        below
                      </p>
                    </div>
                  ) : scanning ? (
                    <div className="text-center">
                      <div className="relative">
                        <QrCode className="h-16 w-16 text-primary animate-pulse mx-auto mb-3" />
                        {/* Scan line animation */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="h-0.5 bg-primary/50 w-full animate-bounce" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scanning...
                      </p>
                    </div>
                  ) : scannedCode ? (
                    <div className="text-center p-6">
                      <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        QR Code Detected!
                      </p>
                      <p className="text-xs font-mono text-muted-foreground bg-secondary rounded px-3 py-1.5 mt-2">
                        {scannedCode}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Camera ready — tap "Start Scanning"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {!scannedCode ? (
                    <Button
                      className="w-full gap-2"
                      onClick={startScanning}
                      disabled={scanning || hasCamera === false}
                    >
                      {scanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {scanning ? "Scanning..." : "Start Scanning"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                          setScannedCode("");
                          setError("");
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Rescan
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleValidateCode(scannedCode)}
                        disabled={isValidating}
                      >
                        {isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Validate Code
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Code Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Enter Code Manually
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="manualCode" className="sr-only">
                      Exam Code
                    </Label>
                    <Input
                      id="manualCode"
                      placeholder="Enter exam code..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Validated - Success */
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Code Validated!</h2>
              <p className="text-sm text-muted-foreground mb-1">Exam code:</p>
              <p className="font-mono text-foreground bg-secondary rounded px-4 py-2 inline-block mb-6">
                {scannedCode || manualCode}
              </p>
              <div>
                <Button onClick={handleProceed} size="lg" className="gap-2">
                  Continue to Join Exam
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
