# CDN Configuration for AutoDocs AI

## Overview

AutoDocs AI is configured to serve static assets through a CDN for optimal performance and global distribution.

## Automatic CDN (Vercel Deployment)

When deployed to **Vercel** (recommended), CDN is automatically configured:

- All static assets are served via Vercel's global edge network
- Automatic cache invalidation on new deployments
- Optimal cache headers configured automatically
- No additional configuration needed

## Custom CDN Setup

For custom deployments with CloudFlare, AWS CloudFront, or other CDN providers:

### 1. Configure CDN Origin

Point your CDN to your Next.js deployment origin:

- Origin: `https://your-app-domain.com`
- Path patterns to cache: `/_next/static/*`, `/static/*`, `/*.{jpg,jpeg,png,gif,svg,ico,webp,avif}`

### 2. Set Environment Variable

```bash
CDN_URL=https://cdn.autodocs.ai
```

Add this to your production environment variables.

### 3. CDN Cache Rules

Configure the following cache rules in your CDN:

**Static Assets** (`/_next/static/*`, `/static/*`):

- TTL: 1 year (31536000 seconds)
- Cache-Control: `public, max-age=31536000, immutable`
- No cache key modifications needed

**Images** (`/*.{jpg,jpeg,png,gif,svg,ico,webp,avif}`):

- TTL: 1 day (86400 seconds)
- Cache-Control: `public, max-age=86400, stale-while-revalidate=604800`
- Enable image optimization if available

**HTML Pages** (`/*.html`, `/`):

- TTL: 0 or very short (60 seconds)
- Cache-Control: `public, max-age=0, must-revalidate` or `s-maxage=60`

### 4. SSL/TLS

- Ensure SSL/TLS is enabled on your CDN
- Use Full (strict) SSL mode if available
- HSTS headers are configured in next.config.ts

### 5. Geographic Distribution

Configure edge locations based on your user base:

- Americas: US East, US West, Brazil
- Europe: London, Frankfurt, Paris
- Asia Pacific: Singapore, Tokyo, Sydney

## Verification

After CDN setup, verify:

1. **Asset URLs**: Check that assets load from CDN domain

   ```
   https://cdn.autodocs.ai/_next/static/...
   ```

2. **Cache Headers**: Verify proper Cache-Control headers

   ```bash
   curl -I https://cdn.autodocs.ai/_next/static/chunks/main.js
   ```

   Should include: `Cache-Control: public, max-age=31536000, immutable`

3. **Geographic Performance**: Test loading times from different regions

4. **Cache Hit Ratio**: Monitor CDN analytics for cache hit percentage (target: >90%)

## Monitoring

Monitor these metrics:

- Cache hit ratio
- Bandwidth usage
- Geographic distribution of requests
- Average response time by region
- CDN errors (4xx, 5xx)

## Cost Optimization

- Use tiered caching if available
- Enable compression (Brotli/Gzip) at CDN level
- Configure origin shield for high-traffic scenarios
- Set up cost alerts in your CDN provider

## Troubleshooting

**Assets not loading from CDN:**

- Verify CDN_URL environment variable is set
- Check CDN origin configuration
- Verify SSL certificate is valid

**Old assets being served:**

- Trigger cache purge/invalidation
- Check cache key configuration
- Verify build ID changed (Next.js handles this automatically)

**Mixed content warnings:**

- Ensure CDN uses HTTPS
- Check that assetPrefix uses https:// protocol
