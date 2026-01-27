"use client";

import { useEffect, useState } from "react";

export default function TestDatabasePage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testDatabase = async () => {
      try {
        setLoading(true);
        setError(null);

        // Test the current user endpoint
        const response = await fetch("http://localhost:4000/api/test-db/current-user", {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(`API Error: ${response.status} - ${data.error || data.message}`);
        } else {
          setResult(data);
        }
      } catch (err: any) {
        setError(`Network Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    testDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Database Test - Test #40
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Testing: Database stores user information correctly
          </h2>

          {loading && <div className="text-gray-600 dark:text-gray-400">Loading...</div>}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-green-800 dark:text-green-400 font-semibold mb-2">
                  ✅ Database Query Successful
                </h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">User Data:</h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-auto">
                  {JSON.stringify(result.user, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Verification Checks:
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <span
                      className={
                        result.verification.has_github_id ? "text-green-600" : "text-red-600"
                      }
                    >
                      {result.verification.has_github_id ? "✅" : "❌"}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      GitHub ID: {result.user.github_id || "Missing"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span
                      className={result.verification.has_email ? "text-green-600" : "text-red-600"}
                    >
                      {result.verification.has_email ? "✅" : "❌"}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Email: {result.user.email || "Missing"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span
                      className={result.verification.has_name ? "text-green-600" : "text-red-600"}
                    >
                      {result.verification.has_name ? "✅" : "❌"}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Name: {result.user.name || "Missing"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span
                      className={
                        result.verification.has_avatar_url ? "text-green-600" : "text-red-600"
                      }
                    >
                      {result.verification.has_avatar_url ? "✅" : "❌"}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Avatar URL: {result.user.avatar_url || "Missing"}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span
                      className={
                        result.verification.has_created_at ? "text-green-600" : "text-red-600"
                      }
                    >
                      {result.verification.has_created_at ? "✅" : "❌"}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Created At: {result.user.created_at || "Missing"}
                    </span>
                  </li>
                </ul>
              </div>

              {result.verification.all_fields_present && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="text-green-800 dark:text-green-400 font-semibold">
                    ✅ All Required Fields Present in Database
                  </h3>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
