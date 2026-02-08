import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "DentalStock Management System",
  description: "ระบบจัดการสต็อกวัสดุและรากเทียมสำหรับคลินิกทันตกรรม",
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DentalStock',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.variable} ${prompt.className} antialiased`}>
        <AuthProvider>
          <AuthLoader>{children}</AuthLoader>
        </AuthProvider>
        <ToasterProvider />
        <ServiceWorkerProvider />
      </body>
    </html>
  );
}

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { isAuthReady } = useAuthStore();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (isAuthReady) {
      setShowLoader(false);
    }
  }, [isAuthReady]);

  if (showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
