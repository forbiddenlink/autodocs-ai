"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";

export function Navigation() {
  return (
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
            <DarkModeToggle />
            <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-foreground hover:text-primary transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded">
              Features
            </button>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/github`}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition inline-block text-center focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              Sign in with GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
