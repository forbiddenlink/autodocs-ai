"use client";

import { useState } from "react";

export default function TestDocsPage() {
  const [repoId, setRepoId] = useState("1");
  const [filterType, setFilterType] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build URL with optional type filter
      const url = filterType
        ? `http://localhost:4000/api/repos/${repoId}/docs?type=${filterType}`
        : `http://localhost:4000/api/repos/${repoId}/docs`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error || "Unknown error"}`);
      } else {
        setResponse(data);
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testUnauthenticated = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Test without credentials to verify auth is required
      const res = await fetch(`http://localhost:4000/api/repos/${repoId}/docs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        setResponse({
          success: true,
          message: "✓ Authentication is required (as expected)",
          status: res.status,
          data,
        });
      } else {
        setError("Expected 401/403 status for unauthenticated request");
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Test: GET /api/repos/:id/docs</h1>
        <p className="text-gray-400 mb-8">Test the repository documentation endpoint</p>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Repository ID</label>
              <input
                type="text"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Filter by Type (optional)</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All types</option>
                <option value="readme">readme</option>
                <option value="api">api</option>
                <option value="function">function</option>
                <option value="class">class</option>
                <option value="architecture">architecture</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={testEndpoint}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Testing..." : "Test Endpoint"}
            </button>

            <button
              onClick={testUnauthenticated}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Test Auth Required
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h3 className="text-green-400 font-semibold mb-4">Response</h3>

            {response.success ? (
              <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-4">
                <p className="text-green-300">{response.message}</p>
                <p className="text-gray-400 text-sm mt-2">Status: {response.status}</p>
              </div>
            ) : null}

            <div className="bg-gray-800 rounded p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300">{JSON.stringify(response, null, 2)}</pre>
            </div>

            {response.documents && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">Documents ({response.count})</h4>
                <div className="space-y-4">
                  {response.documents.map((doc: any) => (
                    <div key={doc.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-blue-400">{doc.path}</h5>
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                          {doc.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        Generated: {new Date(doc.generatedAt).toLocaleString()}
                      </p>
                      <div className="bg-gray-900 rounded p-3 mt-2">
                        <p className="text-xs text-gray-500 mb-2">Preview:</p>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-6">
                          {doc.content.substring(0, 200)}...
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Test Requirements</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Step 1: Generate documentation for repository (mock data provided)</li>
            <li>✓ Step 2: Send GET request to /api/repos/:id/docs</li>
            <li>✓ Step 3: Verify authentication is required</li>
            <li>✓ Step 4: Verify user owns the repository</li>
            <li>✓ Step 5: Verify all documents are returned</li>
            <li>✓ Step 6: Verify documents are properly formatted</li>
            <li>✓ Step 7: Verify optional filtering by document type works</li>
            <li>✓ Step 8: Verify proper error handling</li>
          </ul>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="font-semibold mb-2">Endpoint Documentation</h4>
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-green-400 font-mono">GET</span>{" "}
              <span className="font-mono">/api/repos/:id/docs</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Returns all documentation for a specific repository
            </p>

            <h5 className="font-medium text-sm mb-2">Query Parameters:</h5>
            <ul className="text-sm text-gray-400 space-y-1 mb-4">
              <li>
                <span className="font-mono text-blue-400">type</span> (optional): Filter by document
                type
              </li>
              <li className="ml-4">Values: readme, api, function, class, architecture</li>
            </ul>

            <h5 className="font-medium text-sm mb-2">Response Format:</h5>
            <pre className="text-xs bg-gray-800 rounded p-3 text-gray-300 overflow-x-auto">
              {`{
  "documents": [
    {
      "id": 1,
      "repoId": 1,
      "path": "README.md",
      "type": "readme",
      "content": "...",
      "generatedAt": "2025-12-25T10:00:00Z",
      "updatedAt": "2025-12-25T10:00:00Z"
    }
  ],
  "count": 5,
  "repository": {
    "id": 1,
    "name": "autodocs-ai"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
