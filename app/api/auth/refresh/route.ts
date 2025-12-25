import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth/refresh
 * Refresh the JWT authentication token
 *
 * This endpoint:
 * 1. Forwards the refresh request to the backend
 * 2. Receives a new JWT token
 * 3. Updates the HTTP-only cookie
 * 4. Returns success response
 */
export async function POST(request: NextRequest) {
  try {
    // Get current token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token found", code: "NO_TOKEN" }, { status: 401 });
    }

    // Forward request to backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    const response = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: errorData.error || "Token refresh failed",
          code: errorData.code || "REFRESH_FAILED",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Create response with new token
    const nextResponse = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
      expiresIn: data.expiresIn,
    });

    // Set the new token as HTTP-only cookie
    nextResponse.cookies.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return nextResponse;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
