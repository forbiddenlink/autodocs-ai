import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Development-only endpoint to create a test session
 * This sets a cookie directly on the Next.js domain (localhost:3000)
 * ONLY FOR DEVELOPMENT/TESTING
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    // Import jsonwebtoken
    const jwt = await import("jsonwebtoken");

    // Create a mock user
    const mockUser = {
      id: 1,
      github_id: "12345678",
      email: "demo@autodocs.ai",
      name: "Demo User",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      githubId: "12345678",
    };

    // Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });
    }
    const token = jwt.default.sign(mockUser, secret, { expiresIn: "7d" });

    // Create redirect response
    const response = NextResponse.redirect(new URL("/dashboard", "http://localhost:3000"));

    // Set cookie on the response (dev-only, so secure is always false)
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // Dev-only endpoint, always false
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create session", message: errorMessage },
      { status: 500 }
    );
  }
}
