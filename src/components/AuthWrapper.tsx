
'use client';

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
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
