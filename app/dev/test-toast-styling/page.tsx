"use client";

import { useState } from "react";
import { Toast } from "@/components/Toast";

export default function TestToastStyling() {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showInfoToast, setShowInfoToast] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Toast Styling & Animation Test</h1>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Test the toast notification styling and animation by clicking the buttons below. Observe
            the appearance animation, position, styling, and dismissal animation.
          </p>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Test Requirements (Test #94):</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Step 1: Trigger toast notification ✓ (click button)</li>
              <li>Step 2: Observe appearance animation ✓ (slideIn from right)</li>
              <li>Step 3: Verify smooth slide-in or fade-in ✓ (0.3s ease-out)</li>
              <li>Step 4: Verify toast is positioned correctly (top-right) ✓</li>
              <li>Step 5: Verify toast styling is consistent with design system ✓</li>
              <li>Step 6: Observe dismissal animation ✓ (auto or manual)</li>
              <li>Step 7: Take screenshot of toast for verification ✓</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold">Trigger Toast Notifications:</h2>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowSuccessToast(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              Show Success Toast
            </button>

            <button
              onClick={() => setShowErrorToast(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              Show Error Toast
            </button>

            <button
              onClick={() => setShowInfoToast(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Show Info Toast
            </button>
          </div>
        </div>

        <div className="pt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Toast Component Features:</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Position:</strong> Fixed at top-right (2rem from top and right)
            </li>
            <li>
              <strong>Animation:</strong> slideIn (translateX from 100% to 0, opacity 0 to 1)
            </li>
            <li>
              <strong>Duration:</strong> 0.3s ease-out
            </li>
            <li>
              <strong>Auto-dismiss:</strong> After 3 seconds (configurable)
            </li>
            <li>
              <strong>Z-index:</strong> 10000 (always on top)
            </li>
            <li>
              <strong>Types:</strong> Success (green), Error (red), Info (blue)
            </li>
            <li>
              <strong>Icon:</strong> ✓ for success, ✕ for error, ℹ for info
            </li>
            <li>
              <strong>Manual close:</strong> × button with hover effect
            </li>
            <li>
              <strong>Box shadow:</strong> 0 10px 25px -5px rgba(0, 0, 0, 0.3)
            </li>
            <li>
              <strong>Min width:</strong> 300px, Max width: 500px
            </li>
          </ul>
        </div>

        <div className="pt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Visual Inspection:</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Toast should slide in from the right side</p>
            <p>✓ Toast should be positioned at top-right corner</p>
            <p>✓ Toast should have proper padding, border-radius, and shadows</p>
            <p>✓ Toast colors should match the type (success=green, error=red, info=blue)</p>
            <p>✓ Toast should auto-dismiss after 3 seconds</p>
            <p>✓ Toast can be manually dismissed by clicking ×</p>
            <p>✓ Animation should be smooth (0.3s ease-out)</p>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {showSuccessToast && (
        <Toast
          message="Successfully added 'my-awesome-project' to your repositories"
          type="success"
          duration={3000}
          onClose={() => setShowSuccessToast(false)}
        />
      )}

      {showErrorToast && (
        <Toast
          message="Failed to load repositories. Please check your connection."
          type="error"
          duration={3000}
          onClose={() => setShowErrorToast(false)}
        />
      )}

      {showInfoToast && (
        <Toast
          message="Analysis in progress. This may take a few minutes."
          type="info"
          duration={3000}
          onClose={() => setShowInfoToast(false)}
        />
      )}
    </div>
  );
}
