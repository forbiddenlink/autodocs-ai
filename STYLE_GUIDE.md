# AutoDocs AI - Code Style Guide

This document defines the coding standards and style conventions for the AutoDocs AI project.

## Overview

We use automated tools to enforce consistent code style across the entire codebase:

- **ESLint**: Code quality and JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit validation
- **lint-staged**: Run linters on staged files only

## Setup

All tools are pre-configured. To set up your development environment:

```bash
npm install
```

The `prepare` script will automatically set up Git hooks via Husky.

## Running Linters

### Frontend (Next.js)

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format code
npm run format
```

### Backend (Express)

```bash
# Check for linting errors
npm --prefix backend run lint

# Auto-fix linting errors
npm --prefix backend run lint:fix

# Check formatting
npm --prefix backend run format:check

# Auto-format code
npm --prefix backend run format
```

## Code Style Rules

### General

- **Semicolons**: Required
- **Quotes**: Double quotes for strings
- **Line length**: Max 100 characters
- **Indentation**: 2 spaces (no tabs)
- **Trailing commas**: ES5-compatible (objects, arrays)
- **Line endings**: LF (Unix-style)

### TypeScript/JavaScript

- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and React components
  - `UPPER_CASE` for constants
  - Prefix unused variables with underscore: `_unused`

- **Console statements**:
  - Avoid `console.log` in production code
  - `console.warn` and `console.error` are allowed

- **Type safety**:
  - Avoid `any` type when possible (warning)
  - Use explicit types for function parameters and returns

### React

- **Components**:
  - Use functional components with hooks
  - No need to import React (Next.js 13+)
  - Export default for page components
  - Named exports for utility components

- **Props**:
  - TypeScript interfaces for prop types (no PropTypes)
  - Destructure props in function signature

### Node.js Backend

- **ES Modules**: Use `import`/`export` (not `require`)
- **Error handling**: Use try-catch blocks, avoid `process.exit()` except in scripts
- **Async/await**: Prefer over callbacks or raw Promises
- **Logging**: Use the Winston logger, not `console.log`

## Pre-commit Hooks

Git hooks automatically run when you commit:

1. **lint-staged**: Runs ESLint and Prettier on staged files
2. **Auto-fix**: Attempts to fix issues automatically
3. **Validation**: Commit fails if unfixable errors remain

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## File Organization

```
autodocs-ai/
├── app/              # Next.js pages and routes
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
├── backend/
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic
│   │   └── utils/       # Helper functions
│   └── migrations/      # Database migrations
```

## Configuration Files

- `.eslintrc.json` / `eslint.config.mjs`: ESLint rules (frontend/backend)
- `.prettierrc`: Prettier formatting options
- `.prettierignore`: Files to exclude from formatting
- `.husky/pre-commit`: Git pre-commit hook
- `package.json` → `lint-staged`: Staged file linting config

## Editor Integration

### VS Code

Install these extensions:

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Other Editors

Most modern editors support ESLint and Prettier. Consult your editor's documentation.

## Best Practices

1. **Commit often**: Small, focused commits are easier to review
2. **Write descriptive messages**: Follow conventional commit format
3. **Fix linting errors**: Don't commit with linting errors
4. **Format before committing**: Pre-commit hooks will do this automatically
5. **Review diffs**: Check your changes before committing

## Troubleshooting

### Linting errors won't auto-fix

Some errors require manual fixes. Read the error message carefully.

### Pre-commit hook fails

1. Check the error message
2. Run `npm run lint` manually
3. Fix errors and try again
4. If stuck, ask for help (don't use `--no-verify`)

### Conflicts with Prettier

ESLint and Prettier are configured to work together via `eslint-config-prettier`. If you see conflicts, file an issue.

## Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Next.js ESLint](https://nextjs.org/docs/basic-features/eslint)
- [Husky Documentation](https://typicode.github.io/husky/)

---

Last updated: 2024-12-24
