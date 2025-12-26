"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { CommandPalette } from "@/components/CommandPalette";
import { useState, useEffect } from "react";

export function Navigation() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Listen for Cmd/Ctrl+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <nav
        aria-label="Main navigation"
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <a
                href="/"
                className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
              >
                AutoDocs AI
              </a>
            </div>
            <div
              className="flex items-center gap-2 sm:gap-4"
              role="group"
              aria-label="Navigation actions"
            >
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                aria-label="Show keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </button>
              <DarkModeToggle />
              <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-foreground hover:text-primary transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded">
                Features
              </button>
              {/* Development login for testing (only shown in dev) */}
              {typeof window !== "undefined" && window.location.hostname === "localhost" && (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth-dev/github/dev-login`}
                  className="px-2 py-1 text-xs bg-yellow-500 text-black rounded font-medium hover:bg-yellow-400 transition inline-block text-center"
                  title="Development login (bypasses OAuth)"
                >
                  Dev Login
                </a>
              )}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/github`}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition inline-block text-center focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              >
                Sign in with GitHub
              </a>
            </div>
          </div>
        </div>

        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      </nav>
    </>
  );
}
