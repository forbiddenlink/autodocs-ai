'use client';

// Test page that throws an error to test error.tsx
export default function TestErrorPage() {
  // Throw an error immediately when this component renders
  throw new Error('Test error: This page intentionally throws an error for testing purposes');

  // This code won't be reached
  return <div>This should not render</div>;
}
