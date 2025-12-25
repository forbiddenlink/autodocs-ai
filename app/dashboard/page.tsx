"use client";

import { Navigation } from "@/components/Navigation";
import { useTheme } from "@/components/ThemeProvider";

export default function DashboardPage() {
  const { theme } = useTheme();

  // Use inline styles as fallback since Tailwind custom colors aren't compiling
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
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
        className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl"
      >
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-4 xl:mb-6">Dashboard</h1>
        <section aria-label="Repository list">
          <p className="text-base xl:text-lg" style={{ color: mutedColor }}>
            Your repositories will appear here.
          </p>
          {/* Future: Repository grid will go here with multi-column layout for desktop */}
        </section>
      </main>
    </div>
  );
}
