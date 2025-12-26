"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  /** Custom breadcrumb items to display. If not provided, automatically generates from pathname */
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumbs component provides hierarchical navigation
 * Automatically generates breadcrumbs based on current path if items not provided
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { theme } = useTheme();
  const pathname = usePathname();

  const mutedColor = theme === "dark" ? "hsl(215 20.2% 65.1%)" : "hsl(215.4 16.3% 46.9%)";
  const textColor = theme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)";
  const hoverColor = theme === "dark" ? "hsl(217.2 91.2% 59.8%)" : "hsl(221.2 83.2% 53.3%)";

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on home or dashboard pages
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <svg
                  className="h-4 w-4 mx-2"
                  style={{ color: mutedColor }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}

              {isLast ? (
                <span className="font-medium" style={{ color: textColor }} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
                  style={{ color: mutedColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = mutedColor;
                  }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumb items from pathname
 * Converts /repos/123/chat to: Dashboard > Repository > Chat
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];

  // Handle different route patterns
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const path = "/" + segments.slice(0, i + 1).join("/");

    // Skip if it's a dynamic parameter (looks like a number)
    if (/^\d+$/.test(segment)) {
      // Add "Repository" for repo ID
      breadcrumbs.push({
        label: "Repository",
        href: path,
      });
    } else {
      // Capitalize and format segment
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label,
        href: path,
      });
    }
  }

  return breadcrumbs;
}
