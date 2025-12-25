"use client";

import { Navigation } from "@/components/Navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  githubId: string;
}

export default function RepositoryPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Repository - AutoDocs AI";

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
        setError("Failed to load repository data");
        setLoading(false);
      }
    };

    init();
  }, []);

  // Use inline styles as fallback since Tailwind custom colors aren't compiling
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";

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
      <Navigation />
      <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-6">Repository: {params.id}</h1>
        <p>Repository documentation will be displayed here.</p>
      </main>
    </div>
  );
}
