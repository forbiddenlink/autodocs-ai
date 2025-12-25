"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Update page title for error pages
    document.title = "Error - AutoDocs AI";

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Application error:", error);
    }

    // In production, you might want to log to an error tracking service
    // This is handled by Sentry middleware on the backend
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59))",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          textAlign: "center",
          color: "white",
        }}
      >
        {/* Error Icon */}
        <div
          style={{
            fontSize: "64px",
            marginBottom: "24px",
          }}
        >
          ⚠️
        </div>

        {/* Error Title */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            marginBottom: "16px",
            color: "rgb(248, 250, 252)",
          }}
        >
          Something Went Wrong
        </h1>

        {/* Error Message - User-friendly, no technical details */}
        <p
          style={{
            fontSize: "18px",
            color: "rgb(203, 213, 225)",
            marginBottom: "32px",
            lineHeight: "1.6",
          }}
        >
          We encountered an unexpected error while processing your request. Our team has been
          notified and we're working to fix the issue.
        </p>

        {/* Error Code (if available) - No stack traces */}
        {error.digest && (
          <p
            style={{
              fontSize: "14px",
              color: "rgb(148, 163, 184)",
              marginBottom: "32px",
              fontFamily: "monospace",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={reset}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              backgroundColor: "rgb(59, 130, 246)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "rgb(37, 99, 235)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "rgb(59, 130, 246)";
            }}
          >
            Try Again
          </button>

          <a
            href="/"
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              color: "rgb(203, 213, 225)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.backgroundColor = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            Go Home
          </a>
        </div>

        {/* Help Text */}
        <p
          style={{
            marginTop: "48px",
            fontSize: "14px",
            color: "rgb(148, 163, 184)",
          }}
        >
          If this problem persists, please{" "}
          <a
            href="mailto:support@autodocs.ai"
            style={{
              color: "rgb(59, 130, 246)",
              textDecoration: "underline",
            }}
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
