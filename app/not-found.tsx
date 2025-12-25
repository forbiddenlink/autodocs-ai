import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-8 xl:px-16"
      style={{
        background: "linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59))",
        minHeight: "100vh",
      }}
    >
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        Skip to main content
      </a>

      <main id="main-content" className="max-w-2xl xl:max-w-3xl w-full text-center" role="main">
        {/* Logo/Brand */}
        <header className="mb-8 xl:mb-12">
          <h1
            className="text-6xl xl:text-8xl font-bold mb-2"
            style={{ color: "#ffffff" }}
            aria-label="Error 404"
          >
            404
          </h1>
          <div className="text-xl xl:text-2xl font-semibold mb-4" style={{ color: "#60a5fa" }}>
            AutoDocs AI
          </div>
        </header>

        {/* Error Message */}
        <section className="mb-8 xl:mb-12" aria-labelledby="error-heading">
          <h2
            id="error-heading"
            className="text-3xl xl:text-4xl font-bold mb-4 xl:mb-6"
            style={{ color: "#ffffff" }}
          >
            Page Not Found
          </h2>
          <p className="text-lg xl:text-xl mb-2" style={{ color: "#cbd5e1" }}>
            Oops! The page you're looking for doesn't exist.
          </p>
          <p className="xl:text-lg" style={{ color: "#94a3b8" }}>
            It might have been moved, deleted, or you may have mistyped the URL.
          </p>
        </section>

        {/* Helpful Actions */}
        <nav aria-label="Error page navigation" className="space-y-4 mb-8 xl:mb-12">
          <Link
            href="/"
            className="inline-block font-semibold px-8 py-3 xl:px-10 xl:py-4 xl:text-lg rounded-lg transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
            }}
          >
            Go to Homepage
          </Link>
        </nav>

        {/* Popular Pages */}
        <section
          className="pt-8"
          style={{ borderTop: "1px solid #334155" }}
          aria-label="Quick links"
        >
          <p className="mb-4 text-sm" style={{ color: "#94a3b8" }}>
            Or try one of these pages:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="transition-colors duration-200 rounded focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              style={{ color: "#60a5fa" }}
            >
              Home
            </Link>
            <span style={{ color: "#475569" }}>•</span>
            <Link
              href="/dashboard"
              className="transition-colors duration-200 rounded focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              style={{ color: "#60a5fa" }}
            >
              Dashboard
            </Link>
            <span style={{ color: "#475569" }}>•</span>
            <Link
              href="/settings"
              className="transition-colors duration-200 rounded focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              style={{ color: "#60a5fa" }}
            >
              Settings
            </Link>
          </div>
        </section>

        {/* Contact Section */}
        <footer className="mt-12">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Need help? Contact us at{" "}
            <a
              href="mailto:support@autodocs.ai"
              className="transition-colors rounded focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              style={{ color: "#60a5fa" }}
            >
              support@autodocs.ai
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
