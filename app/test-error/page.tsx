"use client";

import { useEffect } from "react";

// Test page that throws an error to test error.tsx
export default function TestErrorPage() {
  // Throw error only on client side to avoid build issues
  useEffect(() => {
    throw new Error("Test error: This page intentionally throws an error for testing purposes");
  }, []);

  return <div>Loading test error...</div>;
}
