import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { FirebaseProvider } from "@/components/providers/firebase-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pigxel — Marketing Tracking Workspace",
  description: "Structured, organized marketing data tracking. Connect your pixels, define conversion blocks, and understand what's working.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        <FirebaseProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster theme="light" position="bottom-right" richColors closeButton />
        </FirebaseProvider>
      </body>
    </html>
  );
}
