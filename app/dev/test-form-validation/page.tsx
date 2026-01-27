"use client";

import { useState } from "react";

export default function TestFormValidationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTouched, setSearchTouched] = useState(false);

  const validateSearchQuery = (value: string): string | null => {
    // Validation rules for search field
    if (value.length > 0 && value.length < 2) {
      return "Search must be at least 2 characters";
    }
    if (value.length > 100) {
      return "Search cannot exceed 100 characters";
    }
    // Check for invalid characters that don't make sense in repository search
    const invalidChars = /[<>{}[\]\\]/;
    if (invalidChars.test(value)) {
      return "Search contains invalid characters (<>{}[]\\)";
    }
    return null;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Immediate validation feedback
    if (searchTouched) {
      const validationError = validateSearchQuery(value);
      setSearchError(validationError);
    }
  };

  const handleSearchBlur = () => {
    setSearchTouched(true);
    const validationError = validateSearchQuery(searchQuery);
    setSearchError(validationError);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test #106: Form Validation</h1>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search Field Validation Test</h2>

          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium mb-2">
              Search repositories:
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={handleSearchChange}
              onBlur={handleSearchBlur}
              className="w-full px-4 py-2 rounded-lg transition-colors bg-slate-700 text-white"
              style={{
                border: `2px solid ${searchError ? "#ef4444" : searchTouched && !searchError && searchQuery ? "#10b981" : "#475569"}`,
                outline: "none",
              }}
              aria-invalid={!!searchError}
              aria-describedby={searchError ? "search-error" : undefined}
            />

            {searchError && (
              <div
                id="search-error"
                className="mt-2 text-sm flex items-start gap-2"
                style={{ color: "#ef4444" }}
                role="alert"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{searchError}</span>
              </div>
            )}

            {!searchError && searchTouched && searchQuery.length > 0 && (
              <div className="mt-2 text-sm flex items-start gap-2" style={{ color: "#10b981" }}>
                <svg
                  className="h-4 w-4 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Valid search term</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Test Cases:</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>✓ Step 1: Click on search field</li>
            <li>✓ Step 2: Enter "x" (1 character - invalid)</li>
            <li>✓ Step 3: Tab out or click outside</li>
            <li>✓ Step 4: Verify error appears: "Search must be at least 2 characters"</li>
            <li>✓ Step 5: Error message is red with icon</li>
            <li>✓ Step 6: Type "xy" to correct it</li>
            <li>✓ Step 7: Verify error disappears</li>
            <li>✓ Step 8: Verify green border and checkmark (valid state)</li>
          </ul>

          <div className="mt-6 p-4 bg-slate-700 rounded">
            <h4 className="font-semibold mb-2">Current State:</h4>
            <p className="text-sm">Value: "{searchQuery}"</p>
            <p className="text-sm">Touched: {searchTouched ? "Yes" : "No"}</p>
            <p className="text-sm">Error: {searchError || "None"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
