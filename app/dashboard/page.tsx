"use client";

import { Navigation } from "@/components/Navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  githubId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Dashboard - AutoDocs AI";

    // Check authentication status
    const checkAuth = async () => {
      try {
        // In development, try dev endpoint first (doesn't need database)
        const isDevelopment = window.location.hostname === "localhost";
        let response;

        if (isDevelopment) {
          // Try dev endpoint first in development
          response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth-dev/status-dev`,
            {
              credentials: "include",
            }
          );
        }

        // If dev endpoint didn't work or we're not in development, try main endpoint
        if (!response || !response.ok) {
          response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/status`,
            {
              credentials: "include", // Include cookies
            }
          );
        }

        const data = await response.json();

        if (!data.authenticated) {
          // Not authenticated, redirect to home
          router.push("/?error=not_authenticated");
          return;
        }

        setUser(data.user);
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Use inline styles as fallback since Tailwind custom colors aren't compiling
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <div className="text-center">
            <p className="text-lg">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <div className="text-center">
            <p className="text-lg text-red-500">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        Skip to main content
      </a>

      <Navigation />
      <main
        id="main-content"
        className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl"
      >
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-4 xl:mb-6">Dashboard</h1>

        {/* User Profile Section */}
        {user && (
          <section
            aria-label="User profile"
            className="mb-8 p-6 rounded-lg"
            style={{ border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={`${user.name}'s avatar`}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">{user.name}</h2>
                <p className="text-sm sm:text-base" style={{ color: mutedColor }}>
                  {user.email}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Repository List Section */}
        <section aria-label="Repository list">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Your Repositories</h2>
          <p className="text-base xl:text-lg" style={{ color: mutedColor }}>
            Your repositories will appear here.
          </p>
          {/* Future: Repository grid will go here with multi-column layout for desktop */}
        </section>
      </main>
    </div>
  );
}
