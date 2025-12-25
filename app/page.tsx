export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          AutoDocs AI
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          AI-powered documentation platform that automatically generates and maintains
          comprehensive code documentation for your repositories.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition">
            Get Started
          </button>
          <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
