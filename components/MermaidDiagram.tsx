"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  theme?: "dark" | "light";
}

export function MermaidDiagram({ chart, theme = "light" }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid with theme
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    });

    // Generate unique ID for this diagram
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    // Render the diagram
    const renderDiagram = async () => {
      try {
        setError(null);
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError("Failed to render diagram");
      }
    };

    renderDiagram();
  }, [chart, theme]);

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
        role="alert"
      >
        <p className="font-semibold">Diagram Rendering Error</p>
        <p className="text-sm mt-1">{error}</p>
        <details className="mt-2">
          <summary className="text-sm cursor-pointer">Show diagram code</summary>
          <pre className="mt-2 text-xs overflow-x-auto">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      className="mermaid-diagram my-6 flex justify-center items-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
      aria-label="Mermaid diagram"
    />
  );
}
