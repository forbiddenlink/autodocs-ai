"use client";

import { useTheme } from "@/components/ThemeProvider";

interface ErrorStateProps {
  /** The error message to display */
  message: string;
  /** Optional detailed error description */
  description?: string;
  /** Callback function to retry the failed operation */
  onRetry?: () => void;
  /** Optional custom retry button text */
  retryText?: string;
  /** Whether to show the retry button (default: true if onRetry is provided) */
  showRetry?: boolean;
}

/**
 * ErrorState component displays helpful error messages with an optional retry button
 * Used throughout the application for consistent error handling UX
 */
export function ErrorState({
  message,
  description,
  onRetry,
  retryText = "Try Again",
  showRetry = !!onRetry,
}: ErrorStateProps) {
  const { theme } = useTheme();

  const bgColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const errorColor = theme === "dark" ? "#ef4444" : "#dc2626";
  const buttonBg = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const buttonHoverBg = theme === "dark" ? "hsl(217.2 32.6% 20%)" : "hsl(214.3 31.8% 95%)";

  return (
    <div
      className="text-center py-8 px-6 rounded-lg"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon */}
      <div className="mb-4 flex justify-center">
        <svg
          className="h-12 w-12"
          style={{ color: errorColor }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Message */}
      <h3 className="text-lg font-semibold mb-2" style={{ color: errorColor }}>
        {message}
      </h3>

      {/* Optional Description */}
      {description && (
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: mutedColor }}>
          {description}
        </p>
      )}

      {/* Retry Button */}
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
          style={{
            backgroundColor: buttonBg,
            border: `1px solid ${borderColor}`,
            color: errorColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = buttonHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = buttonBg;
          }}
          aria-label={`${retryText} - Retry the failed operation`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {retryText}
          </span>
        </button>
      )}
    </div>
  );
}
