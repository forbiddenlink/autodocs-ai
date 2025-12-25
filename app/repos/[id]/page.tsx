"use client";

import { Navigation } from "@/components/Navigation";
import { useTheme } from "@/components/ThemeProvider";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { useEffect, useState } from "react";
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

interface Document {
  id: number;
  repoId: number;
  path: string;
  type: string;
  content: string;
  generatedAt: string;
  updatedAt: string;
}

interface Repository {
  id: number;
  name: string;
}

export default function RepositoryPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Repository - AutoDocs AI";

    const init = async () => {
      try {
        // Check authentication status
        const isDevelopment = window.location.hostname === "localhost";
        let authResponse;

        if (isDevelopment) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth-dev/status-dev`,
            {
              credentials: "include",
            }
          );
        }

        if (!authResponse || !authResponse.ok) {
          authResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/status`,
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

        // Fetch documentation for this repository
        const docsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/repos/${params.id}/docs`,
          {
            credentials: "include",
          }
        );

        if (!docsResponse.ok) {
          throw new Error("Failed to fetch documentation");
        }

        const docsData = await docsResponse.json();
        setDocuments(docsData.documents || []);
        setRepository(docsData.repository);

        // Select README by default
        const readme = docsData.documents?.find((doc: Document) => doc.type === "readme");
        setSelectedDoc(readme || docsData.documents?.[0] || null);

        setLoading(false);
      } catch (err) {
        console.error("Error during initialization:", err);
        setError("Failed to load repository data");
        setLoading(false);
      }
    };

    init();
  }, [params.id]);

  // Use inline styles as fallback since Tailwind custom colors aren't compiling
  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const cardBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";

  // Add copy buttons to code blocks after render
  useEffect(() => {
    if (!selectedDoc) return;

    const addCopyButtons = () => {
      const codeBlocks = document.querySelectorAll("pre:not(.copy-button-added)");

      codeBlocks.forEach((pre) => {
        pre.classList.add("copy-button-added");

        // Get the code text
        const code = pre.querySelector("code");
        if (!code) return;
        const codeText = code.textContent || "";

        // Create wrapper div
        const wrapper = document.createElement("div");
        wrapper.className = "relative group";
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Create copy button
        const button = document.createElement("button");
        button.className =
          "absolute top-2 right-2 p-2 rounded transition-all opacity-0 group-hover:opacity-100";
        button.style.backgroundColor = borderColor;
        button.setAttribute("aria-label", "Copy code");
        button.innerHTML = `
          <svg class="w-4 h-4" style="opacity: 0.7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        `;

        button.onclick = async () => {
          try {
            await navigator.clipboard.writeText(codeText);
            button.innerHTML = `
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            `;
            setTimeout(() => {
              button.innerHTML = `
                <svg class="w-4 h-4" style="opacity: 0.7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              `;
            }, 2000);
          } catch (err) {
            console.error("Failed to copy:", err);
          }
        };

        wrapper.insertBefore(button, pre);
      });
    };

    // Run after a short delay to ensure ReactMarkdown has rendered
    const timer = setTimeout(addCopyButtons, 300);
    return () => clearTimeout(timer);
  }, [selectedDoc, borderColor]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <div className="text-center">
            <p className="text-lg">Loading...</p>
          </div>
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
      <Navigation />
      <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-2">
            {repository?.name || `Repository ${params.id}`}
          </h1>
          <p className="text-sm opacity-70">Auto-generated documentation</p>
        </div>

        {documents.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <p className="text-lg">No documentation available for this repository yet.</p>
            <p className="text-sm opacity-70 mt-2">
              Documentation will appear here once the repository is analyzed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Document List */}
            <div
              className="lg:col-span-1 rounded-lg p-4"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                maxHeight: "calc(100vh - 200px)",
                overflowY: "auto",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Documentation</h2>
              <nav className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="w-full text-left px-3 py-2 rounded transition-colors"
                    style={{
                      backgroundColor: selectedDoc?.id === doc.id ? borderColor : "transparent",
                      border: `1px solid ${selectedDoc?.id === doc.id ? borderColor : "transparent"}`,
                    }}
                  >
                    <div className="font-medium text-sm">{doc.path}</div>
                    <div className="text-xs opacity-60 mt-1 capitalize">{doc.type}</div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content - Document Viewer */}
            <div
              className="lg:col-span-3 rounded-lg p-6 sm:p-8"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                maxHeight: "calc(100vh - 200px)",
                overflowY: "auto",
              }}
            >
              {selectedDoc ? (
                <div>
                  <div className="mb-6 pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <h2 className="text-2xl font-bold mb-2">{selectedDoc.path}</h2>
                    <div className="flex items-center gap-4 text-sm opacity-70">
                      <span className="capitalize">Type: {selectedDoc.type}</span>
                      <span>Updated: {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
                        ),
                        p: ({ node, ...props }) => <p className="mb-4 leading-7" {...props} />,
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
                        ),
                        code: ({ node, inline, className, children, ...props }: any) => {
                          // Check if this is a Mermaid diagram
                          const match = /language-(\w+)/.exec(className || "");
                          const language = match ? match[1] : "";

                          if (!inline && language === "mermaid") {
                            const code = String(children).replace(/\n$/, "");
                            return <MermaidDiagram chart={code} theme={theme} />;
                          }

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
                          // For block code, just return the code element
                          // The pre wrapper will be handled by the pre component override
                          return (
                            <code
                              className={`block p-4 rounded-lg overflow-x-auto ${className || ""}`}
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
                        pre: ({ node, ...props }) => <pre className="mb-4" {...props} />,
                      }}
                    >
                      {selectedDoc.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg">Select a document to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
