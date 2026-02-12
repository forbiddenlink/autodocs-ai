import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Auth status endpoint
 * Checks if user has a valid JWT token
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Verify token
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return NextResponse.json(
        { authenticated: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      const decoded = jwt.default.verify(token, secret) as {
        id: number;
        name?: string;
        email?: string;
        avatarUrl?: string;
        githubId?: string;
      };

      // Return user data from token
      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.id,
          name: decoded.name || "Demo User",
          email: decoded.email || "demo@autodocs.ai",
          avatarUrl: decoded.avatarUrl || "https://avatars.githubusercontent.com/u/1?v=4",
          githubId: decoded.githubId || "12345678",
        },
      });
    } catch (error) {
      // Token invalid or expired
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      {
        error: "Failed to check authentication status",
      },
      { status: 500 }
    );
  }
}
