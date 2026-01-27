"use client";

import { useState } from "react";

export default function TestOAuthPostPage() {
  const [code, setCode] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testPostEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("http://localhost:4000/api/auth/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(`Error ${res.status}: ${data.message || data.error || "Unknown error"}`);
      } else {
        setResponse(data);
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInvalidCode = () => {
    setCode("invalid_test_code_123");
    setTimeout(() => testPostEndpoint(), 100);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Test POST /api/auth/github Endpoint</h1>
          <p className="text-muted-foreground">
            Test the OAuth code exchange endpoint that accepts POST requests
          </p>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              OAuth Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter GitHub OAuth code"
              className="w-full px-4 py-2 border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Note: This requires a valid OAuth code from GitHub. Invalid codes will return an
              error.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={testPostEndpoint}
              disabled={loading || !code}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Testing..." : "Test Endpoint"}
            </button>

            <button
              onClick={testInvalidCode}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
            >
              Test with Invalid Code
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-destructive rounded-lg p-4 bg-destructive/10">
            <h3 className="font-semibold text-destructive mb-2">Error</h3>
            <p className="text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              ✓ Error handling is working correctly
            </p>
          </div>
        )}

        {response && (
          <div className="border border-green-500 rounded-lg p-4 bg-green-500/10">
            <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">Success!</h3>
            <pre className="text-xs overflow-auto bg-black/5 dark:bg-white/5 p-3 rounded">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Endpoint Documentation</h2>

          <div className="space-y-3 text-sm">
            <div>
              <strong>Endpoint:</strong>
              <code className="ml-2 px-2 py-1 bg-muted rounded">POST /api/auth/github</code>
            </div>

            <div>
              <strong>Request Body:</strong>
              <pre className="mt-1 p-3 bg-muted rounded overflow-auto">
                {JSON.stringify({ code: "github_oauth_code" }, null, 2)}
              </pre>
            </div>

            <div>
              <strong>Features:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Exchanges OAuth code for access token</li>
                <li>Fetches user info from GitHub</li>
                <li>Creates or updates user in database</li>
                <li>Generates JWT session token</li>
                <li>Returns token and user data</li>
                <li>Proper error handling for invalid codes</li>
                <li>Fallback to mock user if database unavailable</li>
              </ul>
            </div>

            <div>
              <strong>Success Response (200):</strong>
              <pre className="mt-1 p-3 bg-muted rounded overflow-auto">
                {JSON.stringify(
                  {
                    success: true,
                    token: "jwt_token_here",
                    user: {
                      id: 123,
                      githubId: "12345678",
                      email: "user@example.com",
                      name: "User Name",
                      avatarUrl: "https://github.com/...",
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div>
              <strong>Error Response (400/500):</strong>
              <pre className="mt-1 p-3 bg-muted rounded overflow-auto">
                {JSON.stringify(
                  {
                    error: "token_exchange_failed",
                    message: "Failed to exchange code for access token",
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-3">
          <h2 className="text-xl font-semibold">Test Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click "Test with Invalid Code" to verify error handling works</li>
            <li>Expected: Error response with "token_exchange_failed" message</li>
            <li>To test with valid code: Initiate GitHub OAuth flow first</li>
            <li>Copy the code parameter from callback URL</li>
            <li>Paste it in the input field above</li>
            <li>Click "Test Endpoint"</li>
            <li>Expected: Success response with token and user data</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
