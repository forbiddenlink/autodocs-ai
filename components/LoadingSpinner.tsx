"use client";

import { useTheme } from "@/components/ThemeProvider";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = "md", text, fullScreen = false }: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const spinner = (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`${sizeClasses[size]} border-4 rounded-full animate-spin`}
        style={{
          borderColor: theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)",
          borderTopColor: "hsl(217.2 91.2% 59.8%)",
        }}
        aria-label={text || "Loading"}
      />
      {text && (
        <p
          className="text-sm"
          style={{
            color: theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)",
          }}
        >
          {text}
        </p>
      )}
      <span className="sr-only">{text || "Loading, please wait..."}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
          color: theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)",
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
