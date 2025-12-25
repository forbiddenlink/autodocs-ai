import { Navigation } from "@/components/Navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AutoDocs AI - AI-Powered Documentation Platform for Your Code",
  description:
    "Automatically generate and maintain comprehensive code documentation for your repositories with AI. Connect your GitHub repos and get instant, up-to-date documentation.",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section
        id="main-content"
        aria-labelledby="hero-heading"
        className="flex flex-col items-center justify-center min-h-screen px-4 py-16 sm:px-8 md:px-16 lg:px-24 xl:px-32 pt-20 sm:pt-24"
      >
        <div className="text-center space-y-4 sm:space-y-6 max-w-4xl xl:max-w-5xl">
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
          >
            AutoDocs AI
          </h1>
          <p className="text-base sm:text-lg md:text-xl xl:text-2xl text-muted-foreground max-w-2xl xl:max-w-4xl mx-auto px-4">
            AI-powered documentation platform that automatically generates and maintains
            comprehensive code documentation for your repositories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8 px-4">
            <button className="px-6 py-3 xl:px-8 xl:py-4 xl:text-lg bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition w-full sm:w-auto focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2">
              Get Started
            </button>
            <button className="px-6 py-3 xl:px-8 xl:py-4 xl:text-lg border border-border rounded-lg font-medium hover:bg-muted transition w-full sm:w-auto focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        aria-labelledby="features-heading"
        className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 xl:px-16 bg-muted/50"
      >
        <div className="max-w-6xl xl:max-w-7xl mx-auto">
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl xl:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16"
          >
            Key Features
          </h2>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 xl:gap-10"
            role="list"
          >
            {/* Feature 1 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                🤖
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                AI-Powered Generation
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                Leverages Claude AI to automatically generate comprehensive documentation including
                READMEs, API docs, and architecture diagrams.
              </p>
            </article>

            {/* Feature 2 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                🔄
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                Auto-Update System
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                GitHub webhooks detect changes and automatically regenerate affected documentation
                when you push code.
              </p>
            </article>

            {/* Feature 3 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                💬
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                AI Chat Interface
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                Ask questions about your codebase in natural language and get instant, context-aware
                answers using RAG technology.
              </p>
            </article>

            {/* Feature 4 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                🔍
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                Code Analysis
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                Tree-sitter parser extracts functions, classes, and relationships to understand your
                codebase structure.
              </p>
            </article>

            {/* Feature 5 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                📚
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                Beautiful Documentation
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                MDX rendering with syntax highlighting, search functionality, and an intuitive
                navigation system.
              </p>
            </article>

            {/* Feature 6 */}
            <article
              className="bg-background p-6 sm:p-8 xl:p-10 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="text-3xl sm:text-4xl xl:text-5xl mb-3 sm:mb-4" aria-hidden="true">
                🔐
              </div>
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2 sm:mb-3">
                GitHub Integration
              </h3>
              <p className="text-sm sm:text-base xl:text-lg text-muted-foreground">
                Seamless OAuth authentication and direct repository access through your GitHub
                account.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
