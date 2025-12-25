"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/ThemeProvider";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
}

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repoName: string) => void;
}

export function AddRepositoryModal({ isOpen, onClose, onSuccess }: AddRepositoryModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";
  const hoverBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's GitHub repositories
  useEffect(() => {
    if (isOpen) {
      fetchGitHubRepos();
    }
  }, [isOpen]);

  const fetchGitHubRepos = async () => {
    try {
      setLoading(true);
      setError(null);

      // In development, we'll use mock data
      // In production, this would fetch from GitHub API via our backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/github/repos`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGithubRepos(data.repositories || []);
      } else if (response.status === 404 || response.status === 501) {
        // Endpoint not implemented yet, use mock data
        const mockRepos: GitHubRepo[] = [
          {
            id: 12345,
            name: "my-awesome-project",
            full_name: "demo-user/my-awesome-project",
            description: "An awesome project that needs documentation",
            html_url: "https://github.com/demo-user/my-awesome-project",
            language: "TypeScript",
            stargazers_count: 15,
            private: false,
          },
          {
            id: 23456,
            name: "backend-api",
            full_name: "demo-user/backend-api",
            description: "RESTful API built with Node.js and Express",
            html_url: "https://github.com/demo-user/backend-api",
            language: "JavaScript",
            stargazers_count: 8,
            private: true,
          },
          {
            id: 34567,
            name: "data-processor",
            full_name: "demo-user/data-processor",
            description: "Python script for processing large datasets",
            html_url: "https://github.com/demo-user/data-processor",
            language: "Python",
            stargazers_count: 22,
            private: false,
          },
          {
            id: 45678,
            name: "mobile-app",
            full_name: "demo-user/mobile-app",
            description: "Cross-platform mobile application",
            html_url: "https://github.com/demo-user/mobile-app",
            language: "Swift",
            stargazers_count: 5,
            private: true,
          },
          {
            id: 56789,
            name: "machine-learning-models",
            full_name: "demo-user/machine-learning-models",
            description: "Collection of ML models for various tasks",
            html_url: "https://github.com/demo-user/machine-learning-models",
            language: "Python",
            stargazers_count: 45,
            private: false,
          },
        ];
        setGithubRepos(mockRepos);
      } else {
        setError("Failed to fetch your GitHub repositories");
      }
    } catch (err) {
      console.error("Error fetching GitHub repos:", err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepository = async () => {
    if (!selectedRepo) return;

    try {
      setAdding(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            githubRepoId: selectedRepo.id.toString(),
            name: selectedRepo.name,
            url: selectedRepo.html_url,
            fullName: selectedRepo.full_name,
            description: selectedRepo.description,
            language: selectedRepo.language,
            private: selectedRepo.private,
          }),
        }
      );

      if (response.ok) {
        // Success! Close modal and trigger refresh
        setSelectedRepo(null);
        setSearchQuery("");
        onSuccess(selectedRepo.name); // Pass repository name for toast
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to add repository");
      }
    } catch (err) {
      console.error("Error adding repository:", err);
      setError("Failed to add repository. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    if (!adding) {
      setSelectedRepo(null);
      setSearchQuery("");
      setError(null);
      onClose();
    }
  };

  // Filter repositories based on search query
  const filteredRepos = githubRepos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      false
    );
  });

  // Helper function to get language color
  const getLanguageColor = (language: string | null): string => {
    if (!language) return "#6e7681";
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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "42rem",
          maxHeight: "90vh",
          borderRadius: "0.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bgColor,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor }}>
          <h2 className="text-2xl font-semibold">Add Repository</h2>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>
            Select a repository from your GitHub account to start generating documentation
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              {/* Loading Spinner */}
              <div className="mb-4 flex justify-center">
                <svg
                  className="animate-spin h-12 w-12"
                  style={{ color: mutedColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p style={{ color: mutedColor }}>Loading your repositories...</p>
            </div>
          )}

          {error && !loading && (
            <div
              className="p-4 rounded-lg mb-4"
              style={{ backgroundColor: "#fee", border: "1px solid #fcc", color: "#c33" }}
            >
              <div className="flex items-start gap-3">
                {/* Error Icon */}
                <svg
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 100%)",
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                  }}
                />
              </div>

              {/* Repository List */}
              <div className="space-y-2">
                {filteredRepos.length === 0 && (
                  <div className="text-center py-12">
                    {/* Search Icon */}
                    <div className="mb-4 flex justify-center">
                      <svg
                        className="h-16 w-16"
                        style={{ color: mutedColor, opacity: 0.5 }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <p style={{ color: mutedColor }}>No repositories found</p>
                    <p className="text-sm mt-2" style={{ color: mutedColor, opacity: 0.8 }}>
                      Try adjusting your search terms
                    </p>
                  </div>
                )}

                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className="w-full text-left p-4 rounded-lg transition"
                    style={{
                      border: `2px solid ${selectedRepo?.id === repo.id ? "#3b82f6" : borderColor}`,
                      backgroundColor:
                        selectedRepo?.id === repo.id
                          ? theme === "dark"
                            ? "hsl(217.2 32.6% 17.5%)"
                            : "hsl(214.3 31.8% 91.4%)"
                          : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{repo.name}</h3>
                      {repo.private && (
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: hoverBg,
                            color: mutedColor,
                          }}
                        >
                          Private
                        </span>
                      )}
                    </div>

                    <p className="text-sm mb-2" style={{ color: mutedColor }}>
                      {repo.description || "No description"}
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
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">⭐ {repo.stargazers_count}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor }}>
          <button
            onClick={handleClose}
            disabled={adding}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${borderColor}`,
              color: textColor,
              opacity: adding ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAddRepository}
            disabled={!selectedRepo || adding}
            className="px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: !selectedRepo || adding ? "#888" : "#3b82f6",
              color: "#fff",
              opacity: !selectedRepo || adding ? 0.5 : 1,
              cursor: !selectedRepo || adding ? "not-allowed" : "pointer",
            }}
          >
            {adding ? "Adding..." : "Add Repository"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
