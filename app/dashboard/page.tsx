"use client";

import { AuthenticatedNav } from "@/components/AuthenticatedNav";
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

interface Repository {
  id: number;
  name: string;
  description: string;
  url: string;
  fullName: string;
  language: string;
  stars: number;
  lastSync: string | null;
  status: string;
  private: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Dashboard - AutoDocs AI";

    const init = async () => {
      try {
        // Check authentication status
        const isDevelopment = window.location.hostname === "localhost";
        let authResponse;

        // Use relative URL to hit Next.js API routes
        authResponse = await fetch("/api/auth/status", {
          credentials: "include",
        });

        const authData = await authResponse.json();

        if (!authData.authenticated) {
          window.location.href = "/?error=not_authenticated";
          return;
        }

        setUser(authData.user);
        setLoading(false);

        // Fetch repositories (in separate try-catch to not break auth)
        try {
          setReposLoading(true);
          const reposResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos`,
            {
              credentials: "include",
            }
          );

          if (reposResponse.ok) {
            const reposData = await reposResponse.json();
            setRepositories(reposData.repositories || []);
          } else {
            setReposError("Failed to load repositories");
          }
        } catch (reposErr) {
          console.error("Error fetching repositories:", reposErr);
          setReposError("Failed to load repositories");
        } finally {
          setReposLoading(false);
        }
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load user data");
        setLoading(false);
        setReposLoading(false);
      }
    };

    init();
  }, []);

  // Use inline styles as fallback since Tailwind custom colors aren't compiling
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";

  // Helper function to get language color
  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      TypeScript: "#3178c6",
      JavaScript: "#f1e05a",
      Python: "#3572A5",
      Go: "#00ADD8",
      Rust: "#dea584",
      Java: "#b07219",
      Ruby: "#701516",
      PHP: "#4F5D95",
      Swift: "#ffac45",
      Kotlin: "#A97BFF",
    };
    return colors[language] || "#6e7681";
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <AuthenticatedNav />
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
        <AuthenticatedNav />
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

      <AuthenticatedNav />
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

          {/* Loading State */}
          {reposLoading && (
            <div className="text-center py-8">
              <p className="text-base xl:text-lg" style={{ color: mutedColor }}>
                Loading repositories...
              </p>
            </div>
          )}

          {/* Error State */}
          {reposError && !reposLoading && (
            <div className="text-center py-8">
              <p className="text-base xl:text-lg text-red-500">{reposError}</p>
            </div>
          )}

          {/* Empty State */}
          {!reposLoading && !reposError && repositories.length === 0 && (
            <div
              className="text-center py-12 px-4 rounded-lg"
              style={{
                border: `1px solid ${borderColor}`,
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
              }}
            >
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16"
                  style={{ color: mutedColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No repositories yet</h3>
              <p className="text-base mb-6 max-w-md mx-auto" style={{ color: mutedColor }}>
                Get started by connecting your GitHub repositories. We'll analyze your code and
                generate comprehensive documentation automatically.
              </p>
              <button
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                onClick={() => {
                  // TODO: Implement add repository flow
                  alert("Add repository feature coming soon!");
                }}
              >
                Add Your First Repository
              </button>
            </div>
          )}

          {/* Repository Grid */}
          {!reposLoading && !reposError && repositories.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 rounded-lg"
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold truncate" title={repo.name}>
                      {repo.name}
                    </h3>
                    {repo.private && (
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor:
                            theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                          color: mutedColor,
                        }}
                      >
                        Private
                      </span>
                    )}
                  </div>

                  <p
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: mutedColor }}
                    title={repo.description}
                  >
                    {repo.description || "No description available"}
                  </p>

                  <div className="flex items-center gap-3 text-sm" style={{ color: mutedColor }}>
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getLanguageColor(repo.language) }}
                        />
                        {repo.language}
                      </span>
                    )}
                    {repo.stars > 0 && (
                      <span className="flex items-center gap-1">⭐ {repo.stars}</span>
                    )}
                  </div>

                  {repo.lastSync && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                      <p className="text-xs" style={{ color: mutedColor }}>
                        Last synced: {new Date(repo.lastSync).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
