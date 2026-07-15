import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./../index.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ExamTrust",
  description: "Academic assessment platform with integrity tracking and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
