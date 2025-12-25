"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/ThemeProvider";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "success", duration = 3000, onClose }: ToastProps) {
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBgColor = () => {
    if (type === "success") {
      return theme === "dark" ? "hsl(142 76% 36%)" : "hsl(142 76% 46%)";
    }
    if (type === "error") {
      return theme === "dark" ? "hsl(0 72% 51%)" : "hsl(0 84% 60%)";
    }
    return theme === "dark" ? "hsl(217 91% 60%)" : "hsl(221 83% 53%)";
  };

  const getIcon = () => {
    if (type === "success") return "✓";
    if (type === "error") return "✕";
    return "ℹ";
  };

  const toastContent = (
    <div
      style={{
        position: "fixed" as const,
        bottom: "2rem",
        right: "2rem",
        zIndex: 10000,
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem 1.5rem",
          borderRadius: "0.5rem",
          backgroundColor: getBgColor(),
          color: "white",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          minWidth: "300px",
          maxWidth: "500px",
        }}
      >
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            width: "1.5rem",
            height: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          {getIcon()}
        </div>
        <div style={{ flex: 1, fontSize: "0.875rem", fontWeight: "500" }}>{message}</div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "1.25rem",
            padding: "0",
            width: "1.5rem",
            height: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.7,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          ×
        </button>
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(toastContent, document.body);
}
