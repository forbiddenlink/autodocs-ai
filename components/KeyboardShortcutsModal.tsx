"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useEffect } from "react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { theme } = useTheme();

  const bgColor = theme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const cardBg = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Close with Escape key
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Cmd/Ctrl", "K"], description: "Open command palette" },
    { keys: ["Escape"], description: "Close modals/panels" },
    { keys: ["Tab"], description: "Navigate between elements" },
    { keys: ["Enter"], description: "Send message in chat" },
    { keys: ["Shift", "Enter"], description: "New line in chat" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="max-w-md w-full rounded-lg p-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-2xl font-bold">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:opacity-70 transition focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: borderColor }}
            aria-label="Close shortcuts dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded"
              style={{ backgroundColor: bgColor }}
            >
              <span className="text-sm" style={{ color: mutedColor }}>
                {shortcut.description}
              </span>
              <div className="flex gap-2">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="px-2 py-1 text-xs font-semibold rounded"
                    style={{
                      backgroundColor: borderColor,
                      border: `1px solid ${borderColor}`,
                      fontFamily: "monospace",
                    }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p className="text-xs text-center" style={{ color: mutedColor }}>
            Press{" "}
            <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: borderColor }}>
              Escape
            </kbd>{" "}
            or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
