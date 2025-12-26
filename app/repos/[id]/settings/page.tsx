"use client";

import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  status: string;
  lastSync: string | null;
}

export default function RepositorySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Form state
  const [autoSync, setAutoSync] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [generateReadme, setGenerateReadme] = useState(true);
  const [generateApi, setGenerateApi] = useState(true);
  const [generateFunctions, setGenerateFunctions] = useState(true);
  const [generateArchitecture, setGenerateArchitecture] = useState(true);

  // Theme-based colors
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const cardBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const dangerColor = theme === "dark" ? "hsl(0 62.8% 30.6%)" : "hsl(0 84.2% 60.2%)";

  useEffect(() => {
    document.title = "Repository Settings - AutoDocs AI";

    const init = async () => {
      try {
        // Check authentication
        const isDevelopment = window.location.hostname === "localhost";
        let authResponse;

        if (isDevelopment) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth-dev/status-dev`,
            {
              credentials: "include",
            }
          );
        }

        if (!authResponse || !authResponse.ok) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/status`,
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

        // Fetch repository details
        const reposResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos`,
          {
            credentials: "include",
          }
        );

        if (reposResponse.ok) {
          const reposData = await reposResponse.json();
          const repo = reposData.repositories?.find(
            (r: Repository) => r.id === parseInt(params.id as string)
          );
          if (repo) {
            setRepository(repo);
          } else {
            setError("Repository not found");
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load repository settings");
        setLoading(false);
      }
    };

    init();
  }, [params.id]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      // TODO: Implement actual API call when backend ready
      // const response = await fetch(
      //   `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos/${params.id}/settings`,
      //   {
      //     method: "PUT",
      //     credentials: "include",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       autoSync,
      //       webhookEnabled,
      //       generateReadme,
      //       generateApi,
      //       generateFunctions,
      //       generateArchitecture,
      //     }),
      //   }
      // );

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateAll = () => {
    setShowRegenerateDialog(true);
  };

  const confirmRegenerate = async () => {
    setIsRegenerating(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos/${params.id}/analyze`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            force: true,
            types: [
              generateReadme && "readme",
              generateApi && "api",
              generateFunctions && "function",
              generateArchitecture && "architecture",
            ].filter(Boolean),
          }),
        }
      );

      if (response.ok) {
        setSuccessMessage(
          "Documentation regeneration started! This may take a few minutes. You'll be notified when it's complete."
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (response.status === 401) {
        setError("Session expired. Please log in again.");
      } else if (response.status === 404) {
        setError("Repository not found.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to start regeneration. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsRegenerating(false);
      setShowRegenerateDialog(false);
    }
  };

  const handleDeleteRepository = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos/${params.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        // Successfully deleted, redirect to dashboard with success message
        router.push("/dashboard?message=repository_deleted");
      } else if (response.status === 401) {
        setError("Session expired. Please log in again.");
        setIsDeleting(false);
        setShowDeleteDialog(false);
      } else if (response.status === 404) {
        setError("Repository not found. It may have already been deleted.");
        setIsDeleting(false);
        setShowDeleteDialog(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to delete repository. Please try again.");
        setIsDeleting(false);
        setShowDeleteDialog(false);
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-4xl">
          <LoadingSpinner fullScreen text="Loading settings..." />
        </main>
      </div>
    );
  }

  if (error && !repository) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-4xl">
          <div className="text-center">
            <p className="text-lg text-red-500">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 px-4 py-2 rounded"
              style={{ backgroundColor: borderColor }}
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <Navigation />

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !isDeleting && setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Remove Repository"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to remove <strong>{repository?.name}</strong>?
            </p>
            <p className="mb-2">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>All generated documentation</li>
              <li>Chat history</li>
              <li>Repository settings</li>
              <li>Webhook configuration</li>
            </ul>
            <p className="font-semibold">This action cannot be undone.</p>
          </div>
        }
        confirmText="Remove Repository"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={showRegenerateDialog}
        onClose={() => !isRegenerating && setShowRegenerateDialog(false)}
        onConfirm={confirmRegenerate}
        title="Regenerate Documentation"
        message={
          <div>
            <p className="mb-2">
              This will regenerate all documentation for <strong>{repository?.name}</strong>.
            </p>
            <p className="mb-2">
              The process may take several minutes depending on the repository size.
            </p>
            <p>Current documentation will be replaced with newly generated content.</p>
          </div>
        }
        confirmText="Regenerate"
        cancelText="Cancel"
        isLoading={isRegenerating}
      />

      <main
        id="main-content"
        className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-4xl"
      >
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: repository?.name || `Repository ${params.id}`,
              href: `/repos/${params.id}`,
            },
            { label: "Settings", href: `/repos/${params.id}/settings` },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/repos/${params.id}`)}
            className="text-sm mb-4 opacity-70 hover:opacity-100 transition-opacity"
          >
            ← Back to Documentation
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Repository Settings</h1>
          <p className="text-sm opacity-70">{repository?.fullName}</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              backgroundColor: theme === "dark" ? "hsl(142 76% 36%)" : "hsl(142 71% 45%)",
              color: "white",
            }}
          >
            {successMessage}
          </div>
        )}

        {error && repository && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              backgroundColor: dangerColor,
              color: "white",
            }}
          >
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Repository Info */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <h2 className="text-xl font-semibold mb-4">Repository Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm opacity-70">Name</label>
                <p className="font-medium">{repository?.name}</p>
              </div>
              <div>
                <label className="text-sm opacity-70">Full Name</label>
                <p className="font-medium">{repository?.fullName}</p>
              </div>
              <div>
                <label className="text-sm opacity-70">Description</label>
                <p className="font-medium">{repository?.description || "No description"}</p>
              </div>
              <div>
                <label className="text-sm opacity-70">Status</label>
                <p className="font-medium capitalize">{repository?.status}</p>
              </div>
              <div>
                <label className="text-sm opacity-70">Last Sync</label>
                <p className="font-medium">
                  {repository?.lastSync
                    ? new Date(repository.lastSync).toLocaleString()
                    : "Never synced"}
                </p>
              </div>
              <div>
                <label className="text-sm opacity-70">GitHub URL</label>
                <a
                  href={repository?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: "hsl(217.2 91.2% 59.8%)" }}
                >
                  {repository?.url}
                </a>
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <h2 className="text-xl font-semibold mb-4">Sync Settings</h2>
            <div className="space-y-4">
              <label
                htmlFor="auto-sync"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">Auto-sync on push</p>
                  <p className="text-sm opacity-70" id="auto-sync-description">
                    Automatically update documentation when code is pushed
                  </p>
                </div>
                <input
                  id="auto-sync"
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="auto-sync-description"
                />
              </label>
              <label
                htmlFor="webhook-enabled"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">GitHub webhook</p>
                  <p className="text-sm opacity-70" id="webhook-description">
                    Enable webhook for real-time updates
                  </p>
                </div>
                <input
                  id="webhook-enabled"
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="webhook-description"
                />
              </label>
            </div>
          </div>

          {/* Documentation Types */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <h2 className="text-xl font-semibold mb-4">Documentation Types</h2>
            <div className="space-y-4">
              <label
                htmlFor="generate-readme"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">README</p>
                  <p className="text-sm opacity-70" id="readme-description">
                    Generate project overview and setup guide
                  </p>
                </div>
                <input
                  id="generate-readme"
                  type="checkbox"
                  checked={generateReadme}
                  onChange={(e) => setGenerateReadme(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="readme-description"
                />
              </label>
              <label
                htmlFor="generate-api"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">API Documentation</p>
                  <p className="text-sm opacity-70" id="api-description">
                    Generate endpoint and API reference docs
                  </p>
                </div>
                <input
                  id="generate-api"
                  type="checkbox"
                  checked={generateApi}
                  onChange={(e) => setGenerateApi(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="api-description"
                />
              </label>
              <label
                htmlFor="generate-functions"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">Function Documentation</p>
                  <p className="text-sm opacity-70" id="functions-description">
                    Document individual functions and methods
                  </p>
                </div>
                <input
                  id="generate-functions"
                  type="checkbox"
                  checked={generateFunctions}
                  onChange={(e) => setGenerateFunctions(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="functions-description"
                />
              </label>
              <label
                htmlFor="generate-architecture"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium">Architecture Diagrams</p>
                  <p className="text-sm opacity-70" id="architecture-description">
                    Generate Mermaid diagrams of system architecture
                  </p>
                </div>
                <input
                  id="generate-architecture"
                  type="checkbox"
                  checked={generateArchitecture}
                  onChange={(e) => setGenerateArchitecture(e.target.checked)}
                  className="w-5 h-5 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-describedby="architecture-description"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: "hsl(217.2 91.2% 59.8%)",
                  color: "white",
                }}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
              <button
                onClick={handleRegenerateAll}
                disabled={isSaving}
                className="w-full px-4 py-3 rounded font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: borderColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                Regenerate All Documentation
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${dangerColor}`,
            }}
          >
            <h2 className="text-xl font-semibold mb-2" style={{ color: dangerColor }}>
              Danger Zone
            </h2>
            <p className="text-sm opacity-70 mb-4">
              These actions cannot be undone. Please be careful.
            </p>
            <button
              onClick={handleDeleteRepository}
              className="px-4 py-2 rounded font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: dangerColor,
                color: "white",
              }}
            >
              Remove Repository
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
