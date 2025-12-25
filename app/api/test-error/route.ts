import { NextResponse } from "next/server";

// Test endpoint to trigger a 500 error for testing error page
export async function GET() {
  // Simulate a server error
  throw new Error("Test error: This endpoint intentionally throws an error for testing purposes");

  // This line won't be reached
  return NextResponse.json({ message: "Success" });
}
