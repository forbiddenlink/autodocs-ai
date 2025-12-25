/**
 * Authentication utilities for handling sessions and redirects
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AuthError {
  error: string;
  message: string;
  code?: string;
  expiredAt?: string;
}

export interface User {
  id: number;
  email: string;
  githubId: number;
}

/**
 * Handle authentication errors and redirect if session expired
 */
export function handleAuthError(error: AuthError, currentPath?: string): void {
  if (
    error.code === "TOKEN_EXPIRED" ||
    error.code === "INVALID_TOKEN" ||
    error.code === "NO_TOKEN"
  ) {
    // Store the current path for redirect after login
    if (currentPath && typeof window !== "undefined") {
      sessionStorage.setItem("redirect_after_login", currentPath);
    }

    // Show user-friendly message about session expiration
    if (typeof window !== "undefined") {
      // Store expiration info for display
      if (error.code === "TOKEN_EXPIRED") {
        sessionStorage.setItem("session_expired", "true");
        sessionStorage.setItem(
          "session_expired_message",
          error.message || "Your session has expired. Please log in again."
        );
      } else if (error.code === "INVALID_TOKEN") {
        sessionStorage.setItem("session_invalid", "true");
        sessionStorage.setItem(
          "session_invalid_message",
          error.message || "Your session is invalid. Please log in again."
        );
      }

      // Redirect to login (which will redirect to GitHub OAuth)
      window.location.href = "/login";
    }
  }
}

/**
 * Make authenticated API request
 * Automatically handles session expiration and redirects
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  currentPath?: string
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Add Authorization header if token exists
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });

  // Check for authentication errors
  if (response.status === 401) {
    try {
      const errorData: AuthError = await response.json();
      handleAuthError(errorData, currentPath);
    } catch (e) {
      // If can't parse error, still redirect
      handleAuthError(
        {
          error: "Unauthorized",
          message: "Your session has expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        },
        currentPath
      );
    }
  }

  return response;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<{ authenticated: boolean; user: User | null }> {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/auth/status`);

    if (response.ok) {
      return await response.json();
    }

    return { authenticated: false, user: null };
  } catch (error) {
    console.error("Error checking authentication:", error);
    return { authenticated: false, user: null };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    // Call logout endpoint
    await authenticatedFetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
    });

    // Clear local storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      sessionStorage.clear();
    }

    // Redirect to home page
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Error during logout:", error);

    // Clear local data anyway
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      sessionStorage.clear();
      window.location.href = "/";
    }
  }
}

/**
 * Get redirect path after login
 */
export function getRedirectAfterLogin(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("redirect_after_login");
}

/**
 * Clear redirect path
 */
export function clearRedirectAfterLogin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("redirect_after_login");
}

/**
 * Get session expiration message
 */
export function getSessionMessage(): {
  expired: boolean;
  invalid: boolean;
  message: string | null;
} {
  if (typeof window === "undefined") {
    return { expired: false, invalid: false, message: null };
  }

  const expired = sessionStorage.getItem("session_expired") === "true";
  const invalid = sessionStorage.getItem("session_invalid") === "true";
  const expiredMessage = sessionStorage.getItem("session_expired_message");
  const invalidMessage = sessionStorage.getItem("session_invalid_message");

  // Clear the messages after reading
  sessionStorage.removeItem("session_expired");
  sessionStorage.removeItem("session_expired_message");
  sessionStorage.removeItem("session_invalid");
  sessionStorage.removeItem("session_invalid_message");

  return {
    expired,
    invalid,
    message: expiredMessage || invalidMessage,
  };
}

/**
 * Refresh authentication token
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

/**
 * Setup automatic token refresh
 * Call this when user logs in or app initializes with valid token
 */
export function setupTokenRefresh(): void {
  if (typeof window === "undefined") return;

  // Refresh token every 6 days (if token expires in 7 days)
  const refreshInterval = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds

  const intervalId = setInterval(async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        // If refresh fails, clear interval
        clearInterval(intervalId);
      }
    } else {
      // No token, clear interval
      clearInterval(intervalId);
    }
  }, refreshInterval);

  // Store interval ID to clear on logout
  (window as any).__tokenRefreshInterval = intervalId;
}

/**
 * Clear token refresh interval
 */
export function clearTokenRefresh(): void {
  if (typeof window === "undefined") return;
  const intervalId = (window as any).__tokenRefreshInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (window as any).__tokenRefreshInterval;
  }
}
