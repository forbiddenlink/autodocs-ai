"use client";

import { DarkModeToggle } from "@/components/DarkModeToggle";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function AuthenticatedNav() {
  const pathname = usePathname();

  // Helper function to check if a link is active
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(path);
  };

  // Get active link styles
  const getLinkClassName = (path: string) => {
    const baseClasses =
      "px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base transition rounded-lg focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2";
    const activeClasses = "bg-primary/10 text-primary font-semibold border-b-2 border-primary";
    const inactiveClasses = "text-foreground hover:text-primary hover:bg-primary/5";

    return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`;
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/dashboard"
              className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
            >
              AutoDocs AI
            </Link>
            <div
              className="hidden sm:flex items-center gap-1"
              role="navigation"
              aria-label="Page navigation"
            >
              <Link href="/dashboard" className={getLinkClassName("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/settings" className={getLinkClassName("/settings")}>
                Settings
              </Link>
            </div>
          </div>
          <div
            className="flex items-center gap-2 sm:gap-4"
            role="group"
            aria-label="Navigation actions"
          >
            <DarkModeToggle />
          </div>
        </div>
        {/* Mobile navigation - show below on small screens */}
        <div className="sm:hidden flex items-center gap-1 pb-2 border-t border-border pt-2 mt-2">
          <Link href="/dashboard" className={getLinkClassName("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/settings" className={getLinkClassName("/settings")}>
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
