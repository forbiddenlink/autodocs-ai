"use client";

import { useTheme } from "@/components/ThemeProvider";

export type AnalysisStage =
  | "pending"
  | "analyzing"
  | "generating_readme"
  | "generating_api"
  | "generating_functions"
  | "generating_architecture"
  | "completed"
  | "error";

interface ProgressIndicatorProps {
  stage: AnalysisStage;
  progress?: number; // 0-100
  currentFile?: string;
  error?: string;
}

export function ProgressIndicator({
  stage,
  progress = 0,
  currentFile,
  error,
}: ProgressIndicatorProps) {
  const { theme } = useTheme();

  const bgColor = theme === "dark" ? "hsl(217.2 32.6% 17.5%)" : "hsl(0 0% 98%)";
  const borderColor = theme === "dark" ? "hsl(217.2 32.6% 27.5%)" : "hsl(214.3 31.8% 91.4%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const successColor = theme === "dark" ? "hsl(142 76% 36%)" : "hsl(142 71% 45%)";
  const errorColor = theme === "dark" ? "hsl(0 62.8% 30.6%)" : "hsl(0 84.2% 60.2%)";
  const progressColor = "hsl(217.2 91.2% 59.8%)"; // Blue

  const stages = [
    { key: "pending", label: "Pending", icon: "⏳" },
    { key: "analyzing", label: "Analyzing Repository", icon: "🔍" },
    { key: "generating_readme", label: "Generating README", icon: "📝" },
    { key: "generating_api", label: "Generating API Docs", icon: "📡" },
    { key: "generating_functions", label: "Documenting Functions", icon: "⚡" },
    { key: "generating_architecture", label: "Creating Diagrams", icon: "📊" },
    { key: "completed", label: "Completed", icon: "✅" },
    { key: "error", label: "Error", icon: "❌" },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === stage);

  const getStageStatus = (index: number): "completed" | "current" | "upcoming" | "error" => {
    if (stage === "error") return "error";
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) return "current";
    return "upcoming";
  };

  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}
      role="status"
      aria-live="polite"
      aria-label={`Documentation generation: ${stages[currentStageIndex]?.label || stage}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {stage === "error" ? "Analysis Failed" : "Documentation Generation"}
        </h3>
        <p className="text-sm" style={{ color: mutedColor }}>
          {stage === "error" && error
            ? error
            : stage === "completed"
              ? "All documentation has been generated successfully!"
              : currentFile
                ? `Processing: ${currentFile}`
                : stages[currentStageIndex]?.label || "Processing..."}
        </p>
      </div>

      {/* Progress bar */}
      {stage !== "error" && stage !== "completed" && (
        <div className="mb-6">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: borderColor }}
          >
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: progressColor,
              }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${progress}%`}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs" style={{ color: mutedColor }}>
              {progress}% complete
            </span>
            {stage === "analyzing" && (
              <span className="text-xs animate-pulse" style={{ color: progressColor }}>
                Analyzing...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stage indicators */}
      <div className="space-y-3">
        {stages
          .filter((s) => s.key !== "pending" && s.key !== "error")
          .map((stageItem, index) => {
            const status = getStageStatus(stages.findIndex((s) => s.key === stageItem.key));
            const isCompleted = status === "completed";
            const isCurrent = status === "current";
            const isError = status === "error";

            return (
              <div
                key={stageItem.key}
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{
                  backgroundColor:
                    isCurrent || isCompleted
                      ? theme === "dark"
                        ? "hsl(217.2 32.6% 20%)"
                        : "hsl(217.2 91.2% 95%)"
                      : "transparent",
                  border: `1px solid ${
                    isCurrent
                      ? progressColor
                      : isCompleted
                        ? successColor
                        : isError
                          ? errorColor
                          : "transparent"
                  }`,
                }}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: isCompleted
                      ? successColor
                      : isCurrent
                        ? progressColor
                        : isError
                          ? errorColor
                          : borderColor,
                    color: isCompleted || isCurrent || isError ? "white" : mutedColor,
                  }}
                >
                  {isCompleted ? "✓" : stageItem.icon}
                </div>
                <div className="flex-1">
                  <div
                    className="font-medium text-sm"
                    style={{
                      color: isCurrent || isCompleted ? textColor : mutedColor,
                    }}
                  >
                    {stageItem.label}
                  </div>
                  {isCurrent && (
                    <div className="text-xs mt-1 animate-pulse" style={{ color: progressColor }}>
                      In progress...
                    </div>
                  )}
                </div>
                {isCurrent && (
                  <div className="animate-spin">
                    <svg
                      className="w-4 h-4"
                      style={{ color: progressColor }}
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Error state */}
      {stage === "error" && (
        <div
          className="mt-4 p-4 rounded-lg flex items-start gap-3"
          style={{
            backgroundColor: theme === "dark" ? "hsl(0 62.8% 15%)" : "hsl(0 84.2% 95%)",
            border: `1px solid ${errorColor}`,
          }}
        >
          <span style={{ color: errorColor }}>❌</span>
          <div className="flex-1">
            <p className="font-medium mb-1" style={{ color: errorColor }}>
              Documentation generation failed
            </p>
            <p className="text-sm" style={{ color: mutedColor }}>
              {error || "An unexpected error occurred. Please try again."}
            </p>
          </div>
        </div>
      )}

      {/* Completed state */}
      {stage === "completed" && (
        <div
          className="mt-4 p-4 rounded-lg flex items-center gap-3"
          style={{
            backgroundColor: theme === "dark" ? "hsl(142 76% 20%)" : "hsl(142 71% 95%)",
            border: `1px solid ${successColor}`,
          }}
        >
          <span style={{ color: successColor }}>✅</span>
          <p className="font-medium" style={{ color: successColor }}>
            Documentation generated successfully!
          </p>
        </div>
      )}
    </div>
  );
}
