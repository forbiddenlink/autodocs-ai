"use client";

import { useEffect } from "react";
import { startTokenRefreshMonitoring, stopTokenRefreshMonitoring } from "@/lib/authRefresh";

/**
 * AuthRefreshProvider
 *
 * Wraps the application and automatically handles JWT token refresh
 * Monitors token expiration and refreshes before it expires
 * Ensures users stay logged in during active sessions
 */
export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start monitoring when component mounts
    startTokenRefreshMonitoring();

    // Cleanup on unmount
    return () => {
      stopTokenRefreshMonitoring();
    };
  }, []);

  return <>{children}</>;
}
