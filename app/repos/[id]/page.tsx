"use client";
// Force rebuild - fixed backend port configuration to 4000

import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/components/ThemeProvider";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

/**
 * Highlights search terms in text with <mark> tags
 * @param text - The text to highlight
 * @param query - The search query to highlight
 * @returns HTML string with highlighted terms
 */
function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create a regex that matches the query case-insensitively
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // Replace matches with <mark> tags
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Calculate fuzzy match score between query and text
 * Uses Levenshtein-like distance for typo tolerance
 * @param query - Search query
 * @param text - Text to match against
 * @returns Match score (0-100, higher is better)
 */
function fuzzyMatchScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return 100;
  }

  // Calculate character-by-character fuzzy score
  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      // Reward sequential matches
      score += i - lastMatchIndex === 1 ? 5 : 3;
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // If we matched all query characters, add bonus
  if (queryIndex === queryLower.length) {
    score += 20;
  }

  // Penalize for length difference
  const lengthDiff = Math.abs(textLower.length - queryLower.length);
  score = Math.max(0, score - lengthDiff * 0.5);

  return score;
}

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
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ doc: Document; matches: number; preview: string }>
  >([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchPerformance, setSearchPerformance] = useState<number | null>(null);

  useEffect(() => {
    // Update page title dynamically for client component
    document.title = "Repository - AutoDocs AI";
    console.log("📚 Documentation viewer with TOC loading...");

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

  // Extract headings for Table of Contents
  useEffect(() => {
    if (!selectedDoc) return;

    const extractHeadings = () => {
      const headingElements = document.querySelectorAll(".prose h1, .prose h2, .prose h3");
      const extractedHeadings: { id: string; text: string; level: number }[] = [];

      headingElements.forEach((heading, index) => {
        const text = heading.textContent || "";
        const level = parseInt(heading.tagName.substring(1));
        const id = `heading-${index}`;

        // Set ID on the heading element for scroll-to functionality
        heading.id = id;

        extractedHeadings.push({ id, text, level });
      });

      setHeadings(extractedHeadings);
    };

    // Run after markdown has rendered
    const timer = setTimeout(extractHeadings, 400);
    return () => clearTimeout(timer);
  }, [selectedDoc]);

  // Track scroll position to highlight active heading in TOC
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better UX

      // Find the active heading based on scroll position
      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveHeading(headings[i].id);
          return;
        }
      }

      // If we haven't found any, set to the first heading
      if (headings.length > 0) {
        setActiveHeading(headings[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once on mount

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // Function to scroll to a heading when clicked in TOC
  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      const yOffset = -80; // Offset for fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Search functionality with performance timing and debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPerformance(null);
      return;
    }

    // Debounce search for better performance
    const debounceTimer = setTimeout(() => {
      const startTime = performance.now();

      const query = searchQuery.toLowerCase();
      const results = documents
        .map((doc) => {
          const content = doc.content.toLowerCase();

          // Exact matches (traditional search)
          const exactMatches = (content.match(new RegExp(query, "gi")) || []).length;

          // Fuzzy matching for typo tolerance (Test #84)
          // Split content into words and check fuzzy score
          const words = content.split(/\s+/);
          let fuzzyScore = 0;
          let fuzzyMatches = 0;

          words.forEach((word) => {
            const score = fuzzyMatchScore(query, word);
            if (score > 50) {
              // Threshold for fuzzy match
              fuzzyScore += score;
              fuzzyMatches++;
            }
          });

          // Combined score: exact matches weighted higher than fuzzy
          const totalMatches = exactMatches + fuzzyMatches * 0.5;

          if (totalMatches === 0) return null;

          // Get a preview of the first match
          const index = content.indexOf(query);
          const start = Math.max(0, index >= 0 ? index - 50 : 0);
          const end = Math.min(content.length, (index >= 0 ? index + query.length : 0) + 50);
          const preview = doc.content.substring(start, end);

          return {
            doc,
            matches: Math.round(totalMatches),
            preview,
            fuzzyScore,
          };
        })
        .filter((result) => result !== null) as Array<{
        doc: Document;
        matches: number;
        preview: string;
        fuzzyScore: number;
      }>;

      // Sort by total matches (exact + fuzzy), then by fuzzy score
      results.sort((a, b) => {
        if (b.matches !== a.matches) {
          return b.matches - a.matches;
        }
        return b.fuzzyScore - a.fuzzyScore;
      });

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      setSearchResults(results);
      setSearchPerformance(searchTime);

      // Log performance for monitoring (Test #22)
      console.log(
        `🔍 Search completed in ${searchTime.toFixed(2)}ms (${results.length} results, exact + fuzzy)`
      );
      if (searchTime > 200) {
        console.warn(`⚠️  Search performance: ${searchTime.toFixed(2)}ms (target: <200ms)`);
      }
    }, 150); // Debounce delay

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, documents]);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
        <Navigation />
        <main className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl">
          <LoadingSpinner fullScreen text="Loading documentation..." />
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
      {/* Search Highlight Styles */}
      <style jsx global>{`
        mark.search-highlight {
          background-color: ${theme === "dark"
            ? "hsla(48, 100%, 50%, 0.3)"
            : "hsla(48, 100%, 67%, 0.5)"};
          color: ${theme === "dark" ? "hsl(48, 100%, 95%)" : "hsl(48, 100%, 10%)"};
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-weight: 600;
        }

        /* Print-friendly styles */
        @media print {
          /* Hide interactive elements */
          .no-print,
          nav,
          button:not(.copy-code-button),
          .search-panel,
          .sidebar,
          .breadcrumbs {
            display: none !important;
          }

          /* Full width layout */
          body {
            background: white !important;
            color: black !important;
          }

          main {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
          }

          .grid {
            display: block !important;
          }

          /* Page break rules */
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          pre,
          code,
          .prose pre {
            page-break-inside: avoid;
            border: 1px solid #ddd !important;
            background: #f9f9f9 !important;
          }

          /* Link URLs */
          a[href^="http"]:after {
            content: " (" attr(href) ")";
            font-size: 9pt;
            color: #666;
          }

          /* Clean styling */
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* Optimize fonts */
          body {
            font-size: 12pt;
            line-height: 1.5;
          }

          h1 {
            font-size: 18pt;
          }
          h2 {
            font-size: 16pt;
          }
          h3 {
            font-size: 14pt;
          }

          /* Ensure content is visible */
          .prose {
            max-width: 100% !important;
          }
        }
      `}</style>
      <Navigation />
      <main
        id="main-content"
        className="container mx-auto p-6 sm:p-8 xl:p-12 pt-24 xl:pt-28 max-w-7xl"
      >
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            {
              label: repository?.name || `Repository ${params.id}`,
              href: `/repos/${params.id}`,
            },
          ]}
        />

        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold mb-2">
              {repository?.name || `Repository ${params.id}`}
            </h1>
            <p className="text-sm opacity-70">Auto-generated documentation</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded font-medium transition-all flex items-center gap-2 no-print"
              style={{
                backgroundColor: borderColor,
                border: `1px solid ${borderColor}`,
              }}
              title="Export as PDF"
              aria-label="Export documentation as PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-4 py-2 rounded font-medium transition-all flex items-center gap-2 no-print"
              style={{
                backgroundColor: borderColor,
                border: `1px solid ${borderColor}`,
              }}
              title="Search (Cmd/Ctrl + K)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              onClick={() => router.push(`/repos/${params.id}/chat`)}
              className="px-4 py-2 rounded font-medium transition-all flex items-center gap-2 no-print"
              style={{
                backgroundColor: "hsl(217.2 91.2% 59.8%)",
                color: "white",
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              AI Chat
            </button>
            <button
              onClick={() => router.push(`/repos/${params.id}/settings`)}
              className="px-4 py-2 rounded font-medium transition-all no-print"
              style={{
                backgroundColor: borderColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <div
            className="mb-6 rounded-lg p-4"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="flex-1 px-4 py-2 rounded focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded"
                style={{
                  backgroundColor: borderColor,
                }}
              >
                Close
              </button>
            </div>

            {searchQuery.trim() && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-70">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </p>
                  {searchPerformance !== null && (
                    <p
                      className="text-xs font-mono"
                      style={{
                        color: searchPerformance < 200 ? "hsl(142 71% 45%)" : "hsl(48 96% 53%)",
                      }}
                      title={
                        searchPerformance < 200
                          ? "Performance target met"
                          : "Performance target: <200ms"
                      }
                    >
                      {searchPerformance.toFixed(1)}ms
                    </p>
                  )}
                </div>
                {searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.doc.id}
                        onClick={() => {
                          setSelectedDoc(result.doc);
                          setShowSearch(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-3 rounded transition-all hover:opacity-80"
                        style={{
                          backgroundColor: bgColor,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <div className="font-medium mb-1">{result.doc.path}</div>
                        <div className="text-sm opacity-70 capitalize mb-1">
                          {result.doc.type} • {result.matches} match
                          {result.matches !== 1 ? "es" : ""}
                        </div>
                        <div
                          className="text-sm opacity-60 truncate"
                          dangerouslySetInnerHTML={{
                            __html:
                              "..." + highlightSearchTerms(result.preview, searchQuery) + "...",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm opacity-60">No results found</p>
                )}
              </div>
            )}
          </div>
        )}

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar - Document List */}
            <div
              className="lg:col-span-3 rounded-lg p-4"
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
              className="lg:col-span-6 rounded-lg p-6 sm:p-8"
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{selectedDoc.path}</h2>
                        <div className="flex items-center gap-4 text-sm opacity-70">
                          <span className="capitalize">Type: {selectedDoc.type}</span>
                          <span>
                            Updated: {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {/* Export button - Test #101 */}
                      <button
                        onClick={() => {
                          // Create a Blob with the markdown content
                          const blob = new Blob([selectedDoc.content], { type: "text/markdown" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${selectedDoc.path.replace(/\//g, "_")}.md`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          console.log(`📥 Exported: ${selectedDoc.path}.md`);
                        }}
                        className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: "hsl(217.2 91.2% 59.8%)",
                          color: "white",
                        }}
                        title="Export as Markdown"
                        aria-label="Export documentation as Markdown file"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Export
                      </button>
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

            {/* Table of Contents */}
            <div
              className="lg:col-span-3 rounded-lg p-4"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                maxHeight: "calc(100vh - 200px)",
                overflowY: "auto",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Table of Contents</h2>
              {headings.length > 0 ? (
                <nav className="space-y-1">
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      onClick={() => scrollToHeading(heading.id)}
                      className="w-full text-left px-2 py-1.5 rounded text-sm transition-colors hover:opacity-80"
                      style={{
                        paddingLeft: `${(heading.level - 1) * 12 + 8}px`,
                        backgroundColor: activeHeading === heading.id ? borderColor : "transparent",
                        fontWeight: activeHeading === heading.id ? "600" : "400",
                      }}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              ) : (
                <p className="text-sm opacity-60">No headings found in this document.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
