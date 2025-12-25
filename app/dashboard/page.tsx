"use client";

import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { ErrorState } from "@/components/ErrorState";
import { AddRepositoryModal } from "@/components/AddRepositoryModal";
import { Toast } from "@/components/Toast";
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
  fileCount?: number;
  lineCount?: number;
}

type SortOption = "name-asc" | "name-desc" | "sync-asc" | "sync-desc";

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");

  // Function to fetch repositories (can be called for retry)
  const fetchRepositories = async () => {
    try {
      setReposLoading(true);
      setReposError(null);

      const reposResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos`,
        {
          credentials: "include",
        }
      );

      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        setRepositories(reposData.repositories || []);
      } else if (reposResponse.status === 401) {
        // Unauthorized - redirect to login
        setReposError("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/?error=session_expired";
        }, 2000);
      } else if (reposResponse.status === 403) {
        setReposError("You don't have permission to access these repositories.");
      } else if (reposResponse.status === 404) {
        setReposError("Repository endpoint not found. Please contact support.");
      } else if (reposResponse.status >= 500) {
        setReposError("Server error. Our team has been notified. Please try again later.");
      } else {
        // Generic error for other status codes
        const errorData = await reposResponse.json().catch(() => ({}));
        setReposError(errorData.error || "Failed to load repositories. Please try again.");
      }
    } catch (reposErr) {
      console.error("Error fetching repositories:", reposErr);
      // Network error or timeout
      if (reposErr instanceof TypeError && reposErr.message.includes("fetch")) {
        setReposError(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      } else {
        setReposError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setReposLoading(false);
    }
  };

  // Function to check authentication (can be called for retry)
  const checkAuthentication = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use relative URL to hit Next.js API routes
      const authResponse = await fetch("/api/auth/status", {
        credentials: "include",
      });

      const authData = await authResponse.json();

      if (!authData.authenticated) {
        window.location.href = "/?error=not_authenticated";
        return;
      }

      setUser(authData.user);
      setLoading(false);

      // After successful auth, fetch repositories
      await fetchRepositories();
    } catch (err) {
      console.error("Error during authentication check:", err);
      setError("Failed to load user data");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Dashboard - AutoDocs AI";
    checkAuthentication();
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

  // Helper function to get status styling
  const getStatusStyle = (status: string) => {
    const styles = {
      completed: {
        color: "#10b981", // green
        bg: theme === "dark" ? "#064e3b" : "#d1fae5",
        icon: "✓",
        label: "Completed",
      },
      analyzing: {
        color: "#f59e0b", // amber
        bg: theme === "dark" ? "#78350f" : "#fef3c7",
        icon: "⟳",
        label: "Analyzing",
      },
      pending: {
        color: "#6b7280", // gray
        bg: theme === "dark" ? "#374151" : "#f3f4f6",
        icon: "○",
        label: "Pending",
      },
      error: {
        color: "#ef4444", // red
        bg: theme === "dark" ? "#7f1d1d" : "#fee2e2",
        icon: "✕",
        label: "Error",
      },
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  // Helper function to sort repositories
  const sortRepositories = (repos: Repository[]): Repository[] => {
    const sorted = [...repos];
    switch (sortOption) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "sync-asc":
        return sorted.sort((a, b) => {
          if (!a.lastSync) return 1;
          if (!b.lastSync) return -1;
          return new Date(a.lastSync).getTime() - new Date(b.lastSync).getTime();
        });
      case "sync-desc":
        return sorted.sort((a, b) => {
          if (!a.lastSync) return 1;
          if (!b.lastSync) return -1;
          return new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime();
        });
      default:
        return sorted;
    }
  };

  // Get sorted repositories
  const sortedRepositories = sortRepositories(repositories);

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
          <ErrorState
            message="Failed to load user data"
            description="We couldn't retrieve your user information. This might be due to a network issue or server problem."
            onRetry={checkAuthentication}
            retryText="Retry"
          />
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-2xl sm:text-3xl font-semibold">Your Repositories</h2>
            {!reposLoading && !reposError && repositories.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="sort-select"
                    className="text-sm font-medium"
                    style={{ color: mutedColor }}
                  >
                    Sort by:
                  </label>
                  <select
                    id="sort-select"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                    style={{
                      backgroundColor:
                        theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="sync-desc">Last Sync (Recent)</option>
                    <option value="sync-asc">Last Sync (Oldest)</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                >
                  Add Repository
                </button>
              </div>
            )}
          </div>

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
            <ErrorState
              message="Failed to load repositories"
              description={reposError}
              onRetry={fetchRepositories}
              retryText="Retry"
            />
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
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Repository
              </button>
            </div>
          )}

          {/* Repository Grid */}
          {!reposLoading && !reposError && repositories.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRepositories.map((repo) => {
                const statusStyle = getStatusStyle(repo.status);
                return (
                  <div
                    key={repo.id}
                    className="p-5 rounded-lg transition-all hover:shadow-lg"
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme === "dark" ? "hsl(217.2 32.6% 12%)" : "hsl(0 0% 100%)",
                    }}
                  >
                    {/* Header with name and private badge */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="text-lg font-semibold truncate flex-1" title={repo.name}>
                        {repo.name}
                      </h3>
                      {repo.private && (
                        <span
                          className="text-xs px-2 py-1 rounded flex-shrink-0"
                          style={{
                            backgroundColor:
                              theme === "dark"
                                ? "hsl(217.2 32.6% 17.5%)"
                                : "hsl(214.3 31.8% 91.4%)",
                            color: mutedColor,
                          }}
                        >
                          Private
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        <span>{statusStyle.icon}</span>
                        <span>{statusStyle.label}</span>
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      className="text-sm mb-4 line-clamp-2 min-h-[2.5rem]"
                      style={{ color: mutedColor }}
                      title={repo.description}
                    >
                      {repo.description || "No description available"}
                    </p>

                    {/* Language and Stars */}
                    <div
                      className="flex items-center gap-3 text-sm mb-3"
                      style={{ color: mutedColor }}
                    >
                      {repo.language && (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getLanguageColor(repo.language) }}
                          />
                          <span>{repo.language}</span>
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-1">⭐ {repo.stars}</span>
                      )}
                    </div>

                    {/* Key Metrics - Files and Lines */}
                    {(repo.fileCount !== undefined || repo.lineCount !== undefined) &&
                      repo.status === "completed" && (
                        <div
                          className="flex items-center gap-4 text-xs mb-3 px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor:
                              theme === "dark" ? "hsl(217.2 32.6% 15%)" : "hsl(214.3 31.8% 95%)",
                            color: mutedColor,
                          }}
                        >
                          {repo.fileCount !== undefined && repo.fileCount > 0 && (
                            <span className="flex items-center gap-1.5 font-medium">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <span>{repo.fileCount.toLocaleString()} files</span>
                            </span>
                          )}
                          {repo.lineCount !== undefined && repo.lineCount > 0 && (
                            <span className="flex items-center gap-1.5 font-medium">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 6h16M4 12h16M4 18h16"
                                />
                              </svg>
                              <span>{repo.lineCount.toLocaleString()} lines</span>
                            </span>
                          )}
                        </div>
                      )}

                    {/* Last Sync */}
                    {repo.lastSync && (
                      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                        <p className="text-xs font-medium" style={{ color: mutedColor }}>
                          Last synced: {new Date(repo.lastSync).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(repoName) => {
          // Show success toast
          setToastMessage(`Successfully added "${repoName}" to your repositories`);
          setShowToast(true);
          // Refresh the repository list after adding
          fetchRepositories();
        }}
      />

      {/* Success Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          duration={4000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
