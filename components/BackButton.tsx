"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallbackUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BackButton({ fallbackUrl = "/dashboard", className, children }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's a history to go back to
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to specified URL if no history
      router.push(fallbackUrl);
    }
  };

  const defaultClassName =
    "inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2";

  return (
    <button onClick={handleBack} className={className || defaultClassName} aria-label="Go back">
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {children || "Back"}
    </button>
  );
}
