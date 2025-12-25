"use client";

import { ErrorState } from "@/components/ErrorState";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";

/**
 * Test page for demonstrating error states with retry functionality
 * This page is for development and testing purposes only
 */
export default function TestErrorPage() {
  const { theme } = useTheme();
  const [errorScenario, setErrorScenario] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)";

  // Simulate different error scenarios
  const simulateError = (type: string) => {
    setIsLoading(true);
    setErrorScenario(null);

    // Simulate network delay
    setTimeout(() => {
      setErrorScenario(type);
      setIsLoading(false);
    }, 500);
  };

  // Handle retry for network error
  const handleNetworkRetry = () => {
    setRetryCount((prev) => prev + 1);
    setErrorScenario(null);
    setIsLoading(true);

    // Simulate retry with potential success after 2 attempts
    setTimeout(() => {
      if (retryCount >= 1) {
        // Success on second retry
        setErrorScenario("success");
        setIsLoading(false);
      } else {
        // Still failing
        setErrorScenario("network");
        setIsLoading(false);
      }
    }, 500);
  };

  // Handle retry for other errors
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    simulateError(errorScenario || "network");
  };

  // Reset test
  const resetTest = () => {
    setErrorScenario(null);
    setRetryCount(0);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="container mx-auto p-6 sm:p-8 xl:p-12 pt-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Error State Testing</h1>

        {/* Test Controls */}
        <div className="mb-8 p-6 rounded-lg" style={{ border: `1px solid ${borderColor}` }}>
          <h2 className="text-xl font-semibold mb-4">Simulate Errors</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => simulateError("network")}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              Network Error
            </button>
            <button
              onClick={() => simulateError("auth")}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              Auth Error
            </button>
            <button
              onClick={() => simulateError("server")}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              Server Error
            </button>
            <button
              onClick={() => simulateError("notfound")}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              Not Found
            </button>
            <button
              onClick={resetTest}
              className="px-4 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              Reset
            </button>
          </div>
          <p className="text-sm opacity-70">Retry count: {retryCount}</p>
        </div>

        {/* Error Display Area */}
        <div className="mb-8">
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-lg">Loading...</p>
            </div>
          )}

          {!isLoading && errorScenario === "network" && (
            <ErrorState
              message="Network Connection Failed"
              description="Unable to connect to the server. Please check your internet connection and try again."
              onRetry={handleNetworkRetry}
              retryText="Try Again"
            />
          )}

          {!isLoading && errorScenario === "auth" && (
            <ErrorState
              message="Authentication Required"
              description="Your session has expired. Please sign in again to continue."
              onRetry={handleRetry}
              retryText="Sign In"
            />
          )}

          {!isLoading && errorScenario === "server" && (
            <ErrorState
              message="Server Error"
              description="Something went wrong on our end. We're working to fix it. Please try again in a few moments."
              onRetry={handleRetry}
              retryText="Retry"
            />
          )}

          {!isLoading && errorScenario === "notfound" && (
            <ErrorState
              message="Resource Not Found"
              description="The requested resource could not be found. It may have been deleted or moved."
              onRetry={handleRetry}
              retryText="Go Back"
            />
          )}

          {!isLoading && errorScenario === "success" && (
            <div
              className="text-center py-8 px-6 rounded-lg"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(142.1 76.2% 36.3%)" : "hsl(142.1 76.2% 36.3%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              <h3 className="text-lg font-semibold mb-2 text-white">✓ Success!</h3>
              <p className="text-sm text-white opacity-90">
                The operation completed successfully after {retryCount}{" "}
                {retryCount === 1 ? "retry" : "retries"}.
              </p>
            </div>
          )}

          {!isLoading && !errorScenario && (
            <div
              className="text-center py-8 px-6 rounded-lg"
              style={{
                backgroundColor:
                  theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)",
                border: `1px solid ${borderColor}`,
              }}
            >
              <p className="text-base">Click a button above to simulate an error scenario</p>
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="p-6 rounded-lg" style={{ border: `1px solid ${borderColor}` }}>
          <h2 className="text-xl font-semibold mb-4">About Error States</h2>
          <ul className="space-y-2 text-sm opacity-80">
            <li>• Error messages are specific and helpful</li>
            <li>• Retry buttons are provided for recoverable errors</li>
            <li>• Icons and colors provide visual feedback</li>
            <li>• Accessible with proper ARIA attributes</li>
            <li>• Network errors simulate success after 2 retries</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
