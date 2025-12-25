"use client";

import { useState, useEffect } from "react";
import { getTokenExpirationInfo, manualRefresh, REFRESH_CONFIG } from "@/lib/authRefresh";

export default function TestTokenRefreshPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Update token info every second
  useEffect(() => {
    const updateInfo = () => {
      const info = getTokenExpirationInfo();
      setTokenInfo(info);
    };

    updateInfo();
    const interval = setInterval(updateInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    setRefreshResult(null);

    try {
      const success = await manualRefresh();
      if (success) {
        setRefreshResult("✅ Token refreshed successfully");
      } else {
        setRefreshResult("❌ Token refresh failed");
      }
    } catch (error) {
      setRefreshResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (needsRefresh: boolean, timeRemaining: number | null): string => {
    if (!timeRemaining || timeRemaining < 0) return "text-red-400";
    if (needsRefresh) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">OAuth Token Refresh Testing</h1>
        <p className="text-gray-400 mb-8">
          Test automatic and manual JWT token refresh functionality
        </p>

        {/* Auto-refresh Status */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Automatic Refresh Status</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Monitoring Active:</span>
              <div
                className={`w-3 h-3 rounded-full ${autoRefreshEnabled ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Check Interval:</p>
              <p className="font-mono text-blue-400">
                {REFRESH_CONFIG.CHECK_INTERVAL_MS / 1000 / 60} minutes
              </p>
            </div>
            <div>
              <p className="text-gray-400">Refresh Threshold:</p>
              <p className="font-mono text-blue-400">
                {REFRESH_CONFIG.REFRESH_THRESHOLD_HOURS} hours before expiry
              </p>
            </div>
          </div>
        </div>

        {/* Token Information */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Token Status</h2>

          {tokenInfo === null ? (
            <p className="text-gray-400">Loading token information...</p>
          ) : !tokenInfo.hasToken ? (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4">
              <p className="text-yellow-300">⚠️ No authentication token found</p>
              <p className="text-sm text-yellow-400 mt-2">
                Please create a session first:{" "}
                <a href="/api/dev-auth/create-session" className="underline hover:text-yellow-200">
                  Create Test Session
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Token Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    tokenInfo.needsRefresh
                      ? "bg-yellow-900/50 text-yellow-300"
                      : "bg-green-900/50 text-green-300"
                  }`}
                >
                  {tokenInfo.needsRefresh ? "⚠️ Needs Refresh" : "✓ Active"}
                </span>
              </div>

              {/* Expiration Time */}
              <div>
                <p className="text-sm text-gray-400 mb-1">Expires At:</p>
                <p className="font-mono text-lg">
                  {tokenInfo.expiresAt ? tokenInfo.expiresAt.toLocaleString() : "Unknown"}
                </p>
              </div>

              {/* Time Remaining */}
              <div>
                <p className="text-sm text-gray-400 mb-1">Time Remaining:</p>
                <p
                  className={`font-mono text-2xl font-bold ${getStatusColor(tokenInfo.needsRefresh, tokenInfo.timeRemaining)}`}
                >
                  {tokenInfo.timeRemaining !== null
                    ? formatTime(tokenInfo.timeRemaining)
                    : "Unknown"}
                </p>
              </div>

              {/* Progress Bar */}
              {tokenInfo.timeRemaining !== null && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Token Lifetime Progress:</p>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        tokenInfo.needsRefresh ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, (tokenInfo.timeRemaining / (REFRESH_CONFIG.TOKEN_EXPIRY_DAYS * 86400)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Auto-refresh indicator */}
              {tokenInfo.needsRefresh && (
                <div className="bg-blue-900/30 border border-blue-700 rounded p-4">
                  <p className="text-blue-300 text-sm">
                    🔄 Automatic refresh will trigger within the next{" "}
                    {REFRESH_CONFIG.CHECK_INTERVAL_MS / 1000 / 60} minutes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Refresh */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual Refresh</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Test the token refresh endpoint manually. This will generate a new token with extended
            expiration.
          </p>

          <button
            onClick={handleManualRefresh}
            disabled={loading || !tokenInfo?.hasToken}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh Token Now"}
          </button>

          {refreshResult && (
            <div
              className={`mt-4 p-4 rounded ${
                refreshResult.startsWith("✅")
                  ? "bg-green-900/30 border border-green-700 text-green-300"
                  : "bg-red-900/30 border border-red-700 text-red-300"
              }`}
            >
              {refreshResult}
            </div>
          )}
        </div>

        {/* Test Instructions */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Test Requirements</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Step 1: Login with GitHub OAuth (or create test session)</li>
            <li>✓ Step 2: Automatic monitoring starts on page load</li>
            <li>✓ Step 3: Token expiration is tracked in real-time</li>
            <li>✓ Step 4: Automatic refresh triggers when threshold reached</li>
            <li>✓ Step 5: Manual refresh works on demand</li>
            <li>✓ Step 6: User stays logged in seamlessly</li>
            <li>✓ Step 7: All refresh actions are logged to console</li>
          </ul>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="font-semibold mb-3">How Automatic Refresh Works</h4>
            <ol className="space-y-2 text-sm text-gray-400">
              <li>
                1. <span className="text-white">AuthRefreshProvider</span> starts monitoring when
                app loads
              </li>
              <li>
                2. Every <span className="text-blue-400">5 minutes</span>, it checks token
                expiration
              </li>
              <li>
                3. If less than{" "}
                <span className="text-yellow-400">
                  {REFRESH_CONFIG.REFRESH_THRESHOLD_HOURS} hours
                </span>{" "}
                remaining, triggers refresh
              </li>
              <li>
                4. Calls <span className="font-mono text-blue-400">/api/auth/refresh</span> endpoint
              </li>
              <li>5. Backend generates new token with extended expiration</li>
              <li>6. New token is set as HTTP-only cookie</li>
              <li>7. User session continues without interruption</li>
            </ol>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="font-semibold mb-3">Testing with Expired Token</h4>
            <p className="text-sm text-gray-400 mb-2">To test the full flow:</p>
            <ol className="space-y-2 text-sm text-gray-400">
              <li>
                1. Create a test session with short expiration (modify{" "}
                <span className="font-mono">generateToken</span> to use "5m")
              </li>
              <li>2. Wait 3-4 minutes (within refresh threshold)</li>
              <li>3. Observe automatic refresh in browser console</li>
              <li>4. Verify new token has extended expiration</li>
              <li>5. Make API requests to verify auth still works</li>
            </ol>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="font-semibold mb-3">Console Logging</h4>
            <p className="text-sm text-gray-400 mb-2">
              Open browser console (F12) to see refresh activity:
            </p>
            <div className="bg-gray-800 rounded p-3 font-mono text-xs text-gray-300 space-y-1">
              <div>🔐 Starting automatic token refresh monitoring</div>
              <div>🔄 Token expiring soon, refreshing...</div>
              <div>✅ Token refreshed successfully</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
