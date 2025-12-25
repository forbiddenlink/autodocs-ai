import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 py-16 sm:px-8 md:px-16 lg:px-24 pt-20 sm:pt-24">
        <div className="text-center space-y-4 sm:space-y-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            AutoDocs AI
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            AI-powered documentation platform that automatically generates and maintains
            comprehensive code documentation for your repositories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8 px-4">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition w-full sm:w-auto">
              Get Started
            </button>
            <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition w-full sm:w-auto">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🤖</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                AI-Powered Generation
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Leverages Claude AI to automatically generate comprehensive documentation including
                READMEs, API docs, and architecture diagrams.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔄</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Auto-Update System</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                GitHub webhooks detect changes and automatically regenerate affected documentation
                when you push code.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">💬</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">AI Chat Interface</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Ask questions about your codebase in natural language and get instant, context-aware
                answers using RAG technology.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Code Analysis</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tree-sitter parser extracts functions, classes, and relationships to understand your
                codebase structure.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📚</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Beautiful Documentation
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                MDX rendering with syntax highlighting, search functionality, and an intuitive
                navigation system.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-background p-6 sm:p-8 rounded-lg shadow-sm border border-border">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔐</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">GitHub Integration</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Seamless OAuth authentication and direct repository access through your GitHub
                account.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
