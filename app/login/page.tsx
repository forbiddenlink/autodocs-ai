"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { getSessionMessage } from "@/lib/auth";

export default function LoginPage() {
  const [sessionMessage, setSessionMessage] = useState<{
    expired: boolean;
    invalid: boolean;
    message: string | null;
  }>({ expired: false, invalid: false, message: null });

  useEffect(() => {
    // Check for session expiration message
    const message = getSessionMessage();
    if (message.expired || message.invalid) {
      setSessionMessage(message);
    }
  }, []);

  const handleGitHubLogin = () => {
    // Redirect to backend OAuth endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
        className="flex-1 flex items-center justify-center px-4 sm:px-8 pt-20"
      >
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Session expiration alert */}
          {(sessionMessage.expired || sessionMessage.invalid) && sessionMessage.message && (
            <div
              className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">
                    {sessionMessage.expired ? "Session Expired" : "Session Invalid"}
                  </p>
                  <p className="text-sm mt-1">{sessionMessage.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logo/Brand */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
              AutoDocs AI
            </h1>
            <p className="text-lg text-muted-foreground">AI-powered documentation platform</p>
          </div>

          {/* Login content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Sign in to continue</h2>
              <p className="text-muted-foreground">
                Connect your GitHub account to get started with automated documentation
              </p>
            </div>

            {/* GitHub login button */}
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-[#24292e] dark:bg-[#ffffff] text-white dark:text-[#24292e] rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Sign in with GitHub</span>
            </button>

            {/* Info text */}
            <p className="text-sm text-muted-foreground">
              By signing in, you agree to access your GitHub repositories for documentation
              generation.
            </p>
          </div>

          {/* Features list */}
          <div className="pt-8 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">What you'll get:</h3>
            <ul className="text-sm text-left space-y-2">
              <li className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span>AI-powered documentation generation</span>
              </li>
              <li className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Automatic updates on code changes</span>
              </li>
              <li className="flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span>AI chat to ask questions about your code</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
