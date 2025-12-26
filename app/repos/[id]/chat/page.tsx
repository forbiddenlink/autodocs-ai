"use client";

import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  githubId: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  responseTime?: number; // Time in ms for AI response
}

interface Repository {
  id: number;
  name: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Theme-based colors
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const cardBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";
  const userMessageBg = theme === "dark" ? "hsl(217.2 91.2% 59.8%)" : "hsl(221.2 83.2% 53.3%)";
  const aiMessageBg = theme === "dark" ? "hsl(215 27.9% 16.9%)" : "hsl(210 40% 96.1%)";

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    document.title = "AI Chat - AutoDocs AI";

    const init = async () => {
      try {
        // Check authentication status
        const isDevelopment = window.location.hostname === "localhost";
        let authResponse;

        if (isDevelopment) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth-dev/status-dev`,
            {
              credentials: "include",
            }
          );
        }

        if (!authResponse || !authResponse.ok) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/status`,
            {
              credentials: "include",
            }
          );
        }

        const authData = await authResponse.json();

        if (!authData.authenticated) {
          window.location.href = "/?error=not_authenticated";
          return;
        }

        setUser(authData.user);

        // Fetch repository details
        const reposResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos`,
          {
            credentials: "include",
          }
        );

        if (reposResponse.ok) {
          const reposData = await reposResponse.json();
          const repo = reposData.repositories?.find(
            (r: Repository) => r.id === parseInt(params.id as string)
          );
          if (repo) {
            setRepository(repo);
          }
        }

        // Load chat history if available
        // For now, start with a welcome message
        setMessages([
          {
            id: 1,
            role: "assistant",
            content: `Hi! I'm your AI assistant for the **${
              repository?.name || "repository"
            }**. I can help you understand the codebase, explain functions, discuss architecture, and answer questions about the documentation. What would you like to know?`,
            timestamp: new Date().toISOString(),
          },
        ]);

        setLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load chat interface");
        setLoading(false);
      }
    };

    init();
  }, [params.id, repository?.name]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsSending(true);

    // Start performance timing
    const startTime = performance.now();

    try {
      // Send message to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos/${params.id}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            message: userMessage.content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Calculate response time
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const aiMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
        responseTime,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Log performance
      console.log(`💬 AI response time: ${responseTime.toFixed(0)}ms`);
      if (responseTime > 3000) {
        console.warn(`⚠️  Response time: ${responseTime.toFixed(0)}ms (target: <3000ms)`);
      }
    } catch (err) {
      console.error("Error sending message:", err);

      // Calculate response time even for mock
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Mock response for development
      const mockResponse: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: `I'd be happy to help with that! Based on the codebase, here's what I can tell you:\n\nThis appears to be a complex question that requires analyzing the repository structure. Once the AI backend is fully integrated, I'll be able to provide detailed, context-aware responses by:\n\n1. **Searching** through the codebase using vector embeddings\n2. **Retrieving** relevant code snippets and documentation\n3. **Analyzing** the context with Claude AI\n4. **Generating** a comprehensive answer\n\n*Note: This is currently a mock response. Full AI chat functionality will be available soon!*`,
        timestamp: new Date().toISOString(),
        responseTime,
      };

      setMessages((prev) => [...prev, mockResponse]);

      console.log(`💬 Mock response time: ${responseTime.toFixed(0)}ms`);
    } finally {
      setIsSending(false);
      // Focus back on input
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setShowClearDialog(true);
  };

  const confirmClearHistory = () => {
    setMessages([
      {
        id: 1,
        role: "assistant",
        content: `Chat history cleared. How can I help you today?`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setShowClearDialog(false);
    console.log("🗑️  Chat history cleared");
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <LoadingSpinner fullScreen text="Loading chat interface..." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <div className="text-center">
            <p className="text-lg text-red-500">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={confirmClearHistory}
        title="Clear Chat History"
        message="Are you sure you want to clear all chat messages? This action cannot be undone."
        confirmText="Clear History"
        cancelText="Cancel"
      />

      <Navigation />
      <main
        id="main-content"
        className="container mx-auto p-4 sm:p-6 xl:p-8 pt-20 xl:pt-24 max-w-5xl"
      >
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: repository?.name || `Repository ${params.id}`,
              href: `/repos/${params.id}`,
            },
            { label: "AI Chat", href: `/repos/${params.id}/chat` },
          ]}
        />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              AI Chat - {repository?.name || `Repository ${params.id}`}
            </h1>
            <p className="text-sm opacity-70">Ask questions about the codebase and documentation</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/repos/${params.id}`)}
              className="px-3 py-2 rounded text-sm transition-colors"
              style={{
                backgroundColor: borderColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              ← Back to Docs
            </button>
            <button
              onClick={handleClearHistory}
              className="px-3 py-2 rounded text-sm transition-colors opacity-70 hover:opacity-100"
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${borderColor}`,
              }}
            >
              Clear History
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div
          className="rounded-lg flex flex-col"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            height: "calc(100vh - 250px)",
            minHeight: "500px",
          }}
        >
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] rounded-lg p-3 sm:p-4"
                  style={{
                    backgroundColor: message.role === "user" ? userMessageBg : aiMessageBg,
                    color: message.role === "user" ? "white" : textColor,
                  }}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          code: ({ node, inline, className, children, ...props }: any) => {
                            if (inline) {
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded text-sm"
                                  style={{
                                    backgroundColor: borderColor,
                                    fontFamily: "monospace",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code
                                className={`block p-3 rounded overflow-x-auto text-sm ${
                                  className || ""
                                }`}
                                style={{
                                  backgroundColor:
                                    theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(220 13% 95%)",
                                  fontFamily: "monospace",
                                }}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside mb-2 space-y-1" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p
                    className="text-xs mt-2 opacity-60"
                    style={{
                      color: message.role === "user" ? "rgba(255,255,255,0.7)" : "inherit",
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}{" "}
                    {message.responseTime && message.role === "assistant" && (
                      <span
                        className="ml-2 font-mono"
                        style={{
                          color:
                            message.responseTime < 3000
                              ? "hsl(142, 71%, 45%)"
                              : "hsl(48, 96%, 53%)",
                        }}
                        title={
                          message.responseTime < 3000
                            ? "✓ Response time target met (<3s)"
                            : "Response time target: <3s"
                        }
                      >
                        • {(message.responseTime / 1000).toFixed(2)}s
                      </span>
                    )}{" "}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: aiMessageBg,
                  }}
                >
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="p-4 border-t"
            style={{
              borderColor: borderColor,
            }}
          >
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the codebase..."
                className="flex-1 rounded px-3 py-2 text-sm sm:text-base resize-none focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  minHeight: "44px",
                  maxHeight: "120px",
                }}
                rows={1}
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="px-4 py-2 rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: userMessageBg,
                  color: "white",
                }}
              >
                {isSending ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs opacity-60 mt-2">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </main>
    </div>
  );
}
