/**
 * Automatic Token Refresh Utility
 *
 * Handles seamless JWT token refresh before expiration
 * Prevents users from being logged out during active sessions
 */

// Token refresh configuration
const TOKEN_EXPIRY_DAYS = 7;
const REFRESH_THRESHOLD_HOURS = 24; // Refresh when less than 24 hours remaining
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

let refreshInterval: NodeJS.Timeout | null = null;
let isRefreshing = false;

/**
 * Decode JWT token without verification (client-side inspection only)
 * Returns expiration time and user data
 */
function decodeToken(token: string): { exp: number; iat: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * Get token from cookies
 * Works with document.cookie in browser
 */
function getTokenFromCookies(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "token") {
      return value;
    }
  }
  return null;
}

/**
 * Check if token needs refresh
 * Returns true if token expires within threshold
 */
function needsRefresh(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const expiresAt = decoded.exp;
  const timeRemaining = expiresAt - now;

  // Convert threshold to seconds
  const thresholdSeconds = REFRESH_THRESHOLD_HOURS * 60 * 60;

  return timeRemaining < thresholdSeconds && timeRemaining > 0;
}

/**
 * Refresh the authentication token
 * Calls backend refresh endpoint and updates cookie
 */
async function refreshAuthToken(): Promise<boolean> {
  if (isRefreshing) {
    console.log("Token refresh already in progress");
    return false;
  }

  try {
    isRefreshing = true;

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Token refresh failed:", response.status);
      return false;
    }

    const data = await response.json();
    console.log("✅ Token refreshed successfully");

    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Check token and refresh if needed
 * Called periodically by the refresh interval
 */
async function checkAndRefresh(): Promise<void> {
  const token = getTokenFromCookies();

  if (!token) {
    // console.log("No token found, skipping refresh check");
    return;
  }

  if (needsRefresh(token)) {
    console.log("🔄 Token expiring soon, refreshing...");
    const success = await refreshAuthToken();

    if (!success) {
      console.warn("⚠️  Token refresh failed, user may need to re-login");
    }
  }
}

/**
 * Start automatic token refresh monitoring
 * Should be called when user logs in or app initializes
 */
export function startTokenRefreshMonitoring(): void {
  if (refreshInterval) {
    console.log("Token refresh monitoring already running");
    return;
  }

  console.log("🔐 Starting automatic token refresh monitoring");

  // Check immediately
  checkAndRefresh();

  // Then check periodically
  refreshInterval = setInterval(() => {
    checkAndRefresh();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop automatic token refresh monitoring
 * Should be called when user logs out
 */
export function stopTokenRefreshMonitoring(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log("Token refresh monitoring stopped");
  }
}

/**
 * Manually trigger token refresh
 * Useful for testing or explicit refresh requests
 */
export async function manualRefresh(): Promise<boolean> {
  console.log("🔄 Manual token refresh triggered");
  return await refreshAuthToken();
}

/**
 * Get token expiration info
 * Returns time remaining until expiration
 */
export function getTokenExpirationInfo(): {
  hasToken: boolean;
  expiresAt: Date | null;
  timeRemaining: number | null;
  needsRefresh: boolean;
} | null {
  const token = getTokenFromCookies();

  if (!token) {
    return {
      hasToken: false,
      expiresAt: null,
      timeRemaining: null,
      needsRefresh: false,
    };
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date(decoded.exp * 1000);
  const timeRemaining = decoded.exp - now;
  const shouldRefresh = needsRefresh(token);

  return {
    hasToken: true,
    expiresAt,
    timeRemaining,
    needsRefresh: shouldRefresh,
  };
}

// Export configuration for testing
export const REFRESH_CONFIG = {
  TOKEN_EXPIRY_DAYS,
  REFRESH_THRESHOLD_HOURS,
  CHECK_INTERVAL_MS,
};
