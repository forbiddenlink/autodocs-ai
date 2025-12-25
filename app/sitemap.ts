import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://autodocs.ai";

  // Get current date for lastModified
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Add more public pages as they are created
    // Note: Dynamic repo pages and private pages should NOT be in sitemap
  ];
}
