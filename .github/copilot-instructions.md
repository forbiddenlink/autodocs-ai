# AutoDocs AI - GitHub Copilot Instructions

## Project Overview

**AutoDocs AI** is an AI-powered documentation platform that auto-generates and maintains comprehensive code documentation for GitHub repositories using Claude AI and RAG (Retrieval-Augmented Generation). It's a **full-stack monorepo** with separated frontend and backend.

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS deployed on Vercel
- **Backend**: Node.js + Express (ES Modules) deployed on Railway with PM2
- **Databases**: PostgreSQL (metadata) + Pinecone (vector embeddings)
- **Auth**: GitHub OAuth with JWT tokens (HTTP-only cookies)

## Architecture

### Frontend (`/app`, `/components`, `/lib`)

- **App Router structure**: Server components by default, use `"use client"` for interactivity
- **Authentication**: JWT tokens in localStorage + HTTP-only cookies, with automatic refresh via [AuthRefreshProvider.tsx](../components/AuthRefreshProvider.tsx)
- **Theme system**: Custom dark mode via [ThemeProvider.tsx](../components/ThemeProvider.tsx) - uses `localStorage` + system preference detection
- **Styling**: Tailwind with custom classes, shadcn/ui components in `components/ui/`
- **API calls**: Use [lib/auth.ts](../lib/auth.ts) `authenticatedFetch()` which handles token refresh and auth errors

### Backend (`/backend/src`)

- **ES Modules only**: Use `import`/`export`, NOT `require()`
- **Middleware stack** (order matters):
  1. Sentry (request/tracing/error handlers)
  2. Helmet + CORS
  3. correlationIdMiddleware - adds tracking ID to all requests
  4. Morgan logging with correlation IDs
  5. metricsMiddleware - Prometheus-style metrics
- **Authentication**: JWT via [middleware/auth.js](../backend/src/middleware/auth.js) - checks `Authorization: Bearer` header OR cookies
- **Database**: Connection pool in [config/database.js](../backend/src/config/database.js)
- **Deployment**: PM2 with zero-downtime reloads (`npm run reload`), configured via [ecosystem.config.cjs](../backend/ecosystem.config.cjs)

## Development Workflow

### Critical Files

- **`feature_list.json`**: SACRED - only change `"passes": false` to `"passes": true`, never edit descriptions or steps
- **[DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md)**: Feature implementation workflow for AI agents
- **[STYLE_GUIDE.md](../STYLE_GUIDE.md)**: ESLint + Prettier configuration (enforced via Husky pre-commit hooks)

### Commands

```bash
# Frontend (root)
npm run dev              # Next.js dev server (port 3000)
npm run build           # Production build
npm run lint            # ESLint check
npm run lint:fix        # Auto-fix linting errors

# Backend (backend/)
npm run dev             # Nodemon dev server (port 4000)
npm run start:pm2       # PM2 production mode
npm run reload          # Zero-downtime PM2 reload
npm run migrate         # Run database migrations
npm run backup          # PostgreSQL backup script

# Both
npm run format          # Prettier auto-format
```

### Environment Setup

Run `./init.sh` to generate `.env.local` and `backend/.env` template files. See [README.md](../README.md) for required API keys:

- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (OAuth)
- `ANTHROPIC_API_KEY` (Claude AI)
- `PINECONE_API_KEY` (vector DB)
- `DATABASE_URL` (PostgreSQL connection string)

## Code Patterns

### Authentication Flow

1. User clicks "Sign in with GitHub" → redirects to `/api/auth/github`
2. GitHub OAuth callback → exchanges code for token → creates/updates user in DB
3. Backend sets JWT in HTTP-only cookie + returns token in response
4. Frontend stores token in localStorage and includes in `Authorization` header
5. [AuthRefreshProvider](../components/AuthRefreshProvider.tsx) auto-refreshes tokens before expiry

**Token validation**: Backend [middleware/auth.js](../backend/src/middleware/auth.js) returns specific error codes:

- `NO_TOKEN`: No auth header/cookie
- `TOKEN_EXPIRED`: JWT expired (includes `expiredAt` timestamp)
- `INVALID_TOKEN`: Malformed/invalid signature

Frontend [lib/auth.ts](../lib/auth.ts) `handleAuthError()` catches these and redirects to `/login` with session storage flags.

### Component Conventions

- **Modal pattern**: Portal-based modals (see [AddRepositoryModal.tsx](../components/AddRepositoryModal.tsx))
  - Use `createPortal(content, document.body)`
  - Click outside/Escape to close
  - Prevent body scroll when open
- **Form validation**: Immediate feedback pattern
  - Track `touched` state per field
  - Show errors only after blur or submit attempt
  - Visual indicators: red border + error icon (invalid), green border + checkmark (valid)
- **Toast notifications**: [Toast.tsx](../components/Toast.tsx) with fixed positioning, accessible via `role="alert"`, auto-dismiss after 5s

### Error Handling

- **Frontend**: [ErrorBoundary.tsx](../components/ErrorBoundary.tsx) catches render errors, [ErrorState.tsx](../components/ErrorState.tsx) for API failures
- **Backend**: Centralized [middleware/errorHandler.js](../backend/src/middleware/errorHandler.js) with Sentry integration
- **Logging**: Use [utils/logger.js](../backend/src/utils/logger.js) with correlation IDs for request tracing

### Database Migrations

- SQL files in `backend/migrations/` with up/down pairs (e.g., `001_initial_schema.sql`, `001_initial_schema.down.sql`)
- Run via `npm run migrate` in backend directory
- Transaction-wrapped with checksum validation

## Testing Strategy

### Test Pages Pattern

All test pages live in `app/test-*/page.tsx` for isolated feature verification:

- [test-form-validation](../app/test-form-validation/page.tsx): Form validation rules
- [test-toast-styling](../app/test-toast-styling/page.tsx): Toast notification variations
- [test-modal](../app/test-modal/page.tsx): Modal behavior testing
- [test-oauth-post](../app/test-oauth-post/page.tsx): OAuth POST endpoint testing
- [test-database](../app/test-database/page.tsx): Database connectivity check

**Testing workflow**: Implement feature → create test page → verify all test steps → mark `passes: true` in `feature_list.json`

### Progress Tracking

- **[claude-progress.txt](../claude-progress.txt)**: Session summaries with test completion tracking (currently 88/186 tests passing)
- **Status**: Database tests (Test #40-42) blocked by PostgreSQL access for 14+ sessions
- **Focus areas**: UI/accessibility tests are prioritized while DB remains blocked

## Deployment

- **Frontend (Vercel)**: Configured via [vercel.json](../vercel.json), includes security headers (X-Frame-Options, CSP, etc.)
- **Backend (Railway)**: Configured via [railway.json](../backend/railway.json), health checks at `/readiness`, 2 replicas for HA
- **Zero-downtime**: PM2 reload strategy with health check validation (see [scripts/deployment/](../scripts/deployment/))

## Documentation Files

For deeper implementation details, see:

- [OAUTH_IMPLEMENTATION.md](../OAUTH_IMPLEMENTATION.md): Complete OAuth flow with security measures
- [DATABASE_IMPLEMENTATION.md](../DATABASE_IMPLEMENTATION.md): Schema design and migration system
- [OAUTH_TOKEN_REFRESH.md](../OAUTH_TOKEN_REFRESH.md): Token refresh mechanism
- [DEPLOYMENT.md](../DEPLOYMENT.md): Production deployment procedures
- [ACCESSIBILITY_IMPROVEMENTS.md](../ACCESSIBILITY_IMPROVEMENTS.md): WCAG compliance notes

## Common Gotchas

1. **Backend must use ES Modules**: `"type": "module"` in [backend/package.json](../backend/package.json), use `.js` extensions in imports
2. **CORS origins**: Backend only allows `process.env.FRONTEND_URL` (default: `http://localhost:3000`)
3. **Dark mode CSS**: Use Tailwind `dark:` prefix, not CSS media queries - theme is controlled by JS
4. **PostgreSQL not running**: Many DB-dependent tests blocked - focus on UI tests instead
5. **Never modify feature_list.json descriptions**: Only change `passes` boolean per [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md)
6. **Correlation IDs**: All backend logs should include `req.headers['x-correlation-id']` for request tracing

## Git Commit Format

Follow pattern in [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md#5-commit):

```
Implement feature #X: [description]

- Detail what was implemented
- Mention any important decisions
- Note any dependencies satisfied

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
