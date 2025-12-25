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

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Settings - AutoDocs AI";

    const init = async () => {
      try {
        // Check authentication status
        const isDevelopment = window.location.hostname === "localhost";
        let authResponse;

        if (isDevelopment) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth-dev/status-dev`,
            {
              credentials: "include",
            }
          );
        }

        if (!authResponse || !authResponse.ok) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/status`,
            {
              credentials: "include",
            }
          );
        }

        const authData = await authResponse.json();

        if (!authData.authenticated) {
          window.location.href = "/?error=not_authenticated";
          return;
        }

        setUser(authData.user);
        setLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load user data");
        setLoading(false);
      }
    };

    init();
  }, []);

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
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-6 xl:mb-8">Settings</h1>

        {/* User Profile Section */}
        {user && (
          <section
            aria-label="User profile"
            className="mb-8 p-6 rounded-lg"
            style={{ border: `1px solid ${borderColor}` }}
          >
            <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.name}'s avatar`}
                    className="w-24 h-24 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: mutedColor }}>
                    Profile Picture
                  </p>
                  <p className="text-sm mt-1" style={{ color: mutedColor }}>
                    Synced from your GitHub account
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: mutedColor }}>
                  Name
                </label>
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor:
                      theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                  }}
                >
                  <p className="text-base">{user.name}</p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: mutedColor }}>
                  Email Address
                </label>
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor:
                      theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                  }}
                >
                  <p className="text-base">{user.email}</p>
                </div>
              </div>

              {/* GitHub Username */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: mutedColor }}>
                  GitHub Username
                </label>
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor:
                      theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                  }}
                >
                  <p className="text-base">@{user.githubId}</p>
                </div>
              </div>

              {/* GitHub ID */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: mutedColor }}>
                  GitHub ID
                </label>
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor:
                      theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                  }}
                >
                  <p className="text-base">{user.githubId}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
              <p className="text-sm" style={{ color: mutedColor }}>
                Your profile information is synced from your GitHub account. To update these
                details, please update them on GitHub and then reconnect your account.
              </p>
            </div>
          </section>
        )}

        {/* Account Section */}
        <section
          aria-label="Account settings"
          className="p-6 rounded-lg"
          style={{ border: `1px solid ${borderColor}` }}
        >
          <h2 className="text-2xl font-semibold mb-4">Account</h2>
          <p className="text-base mb-4" style={{ color: mutedColor }}>
            Manage your AutoDocs AI account settings and preferences.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
          >
            Back to Dashboard
          </button>
        </section>
      </main>
    </div>
  );
}
