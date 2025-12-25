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
      <Navigation />
      <div className="container mx-auto p-8 pt-24">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p style={{ color: mutedColor }}>Your repositories will appear here.</p>
      </div>
    </div>
  );
}
