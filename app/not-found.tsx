import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59))",
        minHeight: "100vh",
      }}
    >
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-2" style={{ color: "#ffffff" }}>
            404
          </h1>
          <div className="text-xl font-semibold mb-4" style={{ color: "#60a5fa" }}>
            AutoDocs AI
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#ffffff" }}>
            Page Not Found
          </h2>
          <p className="text-lg mb-2" style={{ color: "#cbd5e1" }}>
            Oops! The page you're looking for doesn't exist.
          </p>
          <p style={{ color: "#94a3b8" }}>
            It might have been moved, deleted, or you may have mistyped the URL.
          </p>
        </div>

        {/* Helpful Actions */}
        <div className="space-y-4 mb-8">
          <Link
            href="/"
            className="inline-block font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
            }}
          >
            Go to Homepage
          </Link>
        </div>

        {/* Popular Pages */}
        <div className="pt-8" style={{ borderTop: "1px solid #334155" }}>
          <p className="mb-4 text-sm" style={{ color: "#94a3b8" }}>
            Or try one of these pages:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="transition-colors duration-200" style={{ color: "#60a5fa" }}>
              Home
            </Link>
            <span style={{ color: "#475569" }}>•</span>
            <Link
              href="/dashboard"
              className="transition-colors duration-200"
              style={{ color: "#60a5fa" }}
            >
              Dashboard
            </Link>
            <span style={{ color: "#475569" }}>•</span>
            <Link
              href="/settings"
              className="transition-colors duration-200"
              style={{ color: "#60a5fa" }}
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Search Section (Optional for future) */}
        <div className="mt-12">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Need help? Contact us at{" "}
            <a
              href="mailto:support@autodocs.ai"
              className="transition-colors"
              style={{ color: "#60a5fa" }}
            >
              support@autodocs.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
