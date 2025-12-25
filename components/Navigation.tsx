"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center">
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              AutoDocs AI
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <DarkModeToggle />
            <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-foreground hover:text-primary transition">
              Features
            </button>
            <a
              href="http://localhost:3001/api/auth/github"
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition inline-block text-center"
            >
              Sign in with GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
