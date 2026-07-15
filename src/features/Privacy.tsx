"use client";

import { Header } from '@/components/layout/Header';
import Link from "next/link";
export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">Privacy & Data Retention</h1>
          <p className="text-muted-foreground mb-6">
            ExamTrust collects limited proctoring data (IP address, user agent, proctoring events) to
            support exam integrity and auditing. This data is retained for a limited period and
            pseudonymized or removed according to institutional policy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">What we collect</h2>
          <ul className="list-disc ml-6 text-muted-foreground">
            <li>Client IP address and derived location metadata (for audit & whitelist)</li>
            <li>User agent string</li>
            <li>Proctoring logs (tab switches, mouse anomalies, integrity events)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">Retention</h2>
          <p className="text-muted-foreground">Default retention: 90 days. After that, IPs are pseudonymized or deleted.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Your rights</h2>
          <p className="text-muted-foreground">Students may request data deletion or raise concerns via privacy@example.com.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Operational details</h2>
          <p className="text-muted-foreground">Admins can view more details in the admin console. For operators, see <Link href="/admin/system-policy">System Policy</Link> and the repo <Link href="/docs/ops/retention">retention runbook</Link> (internal).</p>

          <div className="mt-10">
            <Link href="/" className="text-primary">Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}



