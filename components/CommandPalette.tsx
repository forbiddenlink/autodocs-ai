"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
  keywords: string[];
  category: "Navigation" | "Actions" | "Settings";
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const cardBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const highlightBg = theme === "dark" ? "hsl(217.2 32.6% 20%)" : "hsl(217.2 91.2% 95%)";

  // Define available commands
  const commands: Command[] = [
    {
      id: "dashboard",
      title: "Go to Dashboard",
      subtitle: "View all repositories",
      icon: "🏠",
      action: () => {
        router.push("/dashboard");
        onClose();
      },
      keywords: ["dashboard", "home", "repositories", "repos"],
      category: "Navigation",
    },
    {
      id: "settings",
      title: "Open Settings",
      subtitle: "Configure your preferences",
      icon: "⚙️",
      action: () => {
        router.push("/settings");
        onClose();
      },
      keywords: ["settings", "preferences", "config", "configuration"],
      category: "Navigation",
    },
    {
      id: "theme",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      subtitle: "Toggle theme",
      icon: theme === "dark" ? "☀️" : "🌙",
      action: () => {
        toggleTheme();
        onClose();
      },
      keywords: ["theme", "dark", "light", "mode", "appearance"],
      category: "Settings",
    },
    {
      id: "shortcuts",
      title: "Keyboard Shortcuts",
      subtitle: "View all shortcuts",
      icon: "⌨️",
      action: () => {
        onClose();
        // Trigger keyboard shortcuts modal (will be handled by parent)
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
      },
      keywords: ["keyboard", "shortcuts", "hotkeys", "keys"],
      category: "Actions",
    },
  ];

  // Filter commands based on query
  const filteredCommands = query.trim()
    ? commands.filter((cmd) => {
        const searchText = query.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchText) ||
          cmd.subtitle?.toLowerCase().includes(searchText) ||
          cmd.keywords.some((keyword) => keyword.includes(searchText))
        );
      })
    : commands;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 p-4"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: mutedColor }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-lg"
            style={{ color: textColor }}
            aria-label="Search commands"
          />
          <kbd
            className="px-2 py-1 text-xs rounded"
            style={{
              backgroundColor: borderColor,
              color: mutedColor,
              fontFamily: "monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto p-2" style={{ backgroundColor: bgColor }}>
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8" style={{ color: mutedColor }}>
              <p>No commands found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <div
                  className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: mutedColor }}
                >
                  {category}
                </div>
                <div className="space-y-1">
                  {cmds.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: isSelected ? highlightBg : "transparent",
                          color: textColor,
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <span className="text-2xl">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-sm truncate" style={{ color: mutedColor }}>
                              {cmd.subtitle}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <kbd
                            className="px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor: borderColor,
                              color: mutedColor,
                              fontFamily: "monospace",
                            }}
                          >
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 text-xs"
          style={{
            backgroundColor: bgColor,
            borderTop: `1px solid ${borderColor}`,
            color: mutedColor,
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded"
                style={{ backgroundColor: borderColor, fontFamily: "monospace" }}
              >
                ↑
              </kbd>
              <kbd
                className="px-1.5 py-0.5 rounded"
                style={{ backgroundColor: borderColor, fontFamily: "monospace" }}
              >
                ↓
              </kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded"
                style={{ backgroundColor: borderColor, fontFamily: "monospace" }}
              >
                ↵
              </kbd>
              <span className="ml-1">Select</span>
            </span>
          </div>
          <span>Cmd/Ctrl + K to open</span>
        </div>
      </div>
    </div>
  );
}
