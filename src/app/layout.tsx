import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { SavingOverlayProvider } from "@/components/layout/saving-overlay-provider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TutorEase",
  description: "Tuition management portal.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geistSans.variable, geistMono.variable)}
    >
      <body>
        {children}
        <Suspense fallback={null}>
          <SavingOverlayProvider />
        </Suspense>
      </body>
    </html>
  );
}
