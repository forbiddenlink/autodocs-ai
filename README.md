# AutoDocs AI

> AI-powered documentation platform that automatically generates and maintains comprehensive code documentation for your GitHub repositories.

## 🚀 Overview

AutoDocs AI connects to your GitHub repositories, analyzes your codebase using advanced parsing techniques, and generates comprehensive, always-up-to-date documentation using Claude AI. The platform features an intelligent chat interface that allows you to ask questions about your codebase using natural language with context-aware responses powered by RAG (Retrieval-Augmented Generation).

## ✨ Features

- 🔐 **GitHub Integration**: Seamless OAuth authentication and repository access
- 📚 **AI Documentation**: Auto-generate README, API docs, function descriptions, and architecture diagrams
- 💬 **Smart Chat**: Ask questions about your codebase in natural language with RAG-powered responses
- 🔄 **Auto-Updates**: Webhook-based documentation updates on every push
- 🔍 **Powerful Search**: Find anything across your documentation in under 200ms
- 🎨 **Beautiful UI**: Modern design with Next.js 14, Tailwind CSS, and shadcn/ui
- 🌙 **Dark Mode**: Full dark mode support across the entire application
- 🔒 **Secure**: Built with security best practices including CSRF protection, XSS prevention, and rate limiting

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **PostgreSQL** - Relational database for metadata
- **Pinecone** - Vector database for embeddings

### AI & Analysis

- **Claude API (Anthropic)** - AI-powered documentation generation
- **Tree-sitter** - Code parsing and AST generation
- **RAG** - Retrieval-Augmented Generation for context-aware chat

### Infrastructure

- **Vercel** - Frontend deployment
- **Railway** - Backend deployment
- **GitHub OAuth** - Authentication
- **GitHub Webhooks** - Auto-updates on push events

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://www.postgresql.org/)
- **Git** - Version control

You'll also need accounts and API keys for:

- **GitHub** - For OAuth and repository access
- **Anthropic** - For Claude API access
- **Pinecone** - For vector embeddings storage

## 🚀 Quick Start

### 1. Run the Setup Script

```bash
./init.sh
```

This automated script will:

- ✓ Verify Node.js installation
- ✓ Create environment configuration files
- ✓ Install all dependencies
- ✓ Provide detailed setup instructions

### 2. Configure Environment Variables

Update `.env.local` and `backend/.env` with your API keys (the init script creates these files for you).

### 3. Set Up Services

#### PostgreSQL Database

```bash
createdb autodocs_dev
cd backend && npm run migrate
```

#### GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App with callback: `http://localhost:3000/api/auth/callback`
3. Add credentials to `.env` files

#### Anthropic API Key

1. Get key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env` files

#### Pinecone Index

1. Create index at [Pinecone](https://www.pinecone.io/)
2. Name: `autodocs`, Dimension: `1536`
3. Add credentials to `.env` files

### 4. Start Development Servers

**Terminal 1 (Backend):**

```bash
cd backend && npm run dev
```

**Terminal 2 (Frontend):**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
autodocs-ai/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard pages
│   ├── repos/            # Repository pages
│   └── api/              # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── backend/              # Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── models/      # Database models
│   │   └── utils/       # Utilities
│   └── ...
├── lib/                  # Shared libraries
├── public/              # Static assets
├── designs/             # UI design files
├── feature_list.json    # 200+ comprehensive test cases
├── init.sh             # Automated setup script
├── app_spec.txt        # Application specification
└── README.md           # This file
```

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Comprehensive CI/CD pipeline and deployment procedures
- **[Zero-Downtime Deployment](./ZERO_DOWNTIME_DEPLOYMENT.md)** - Zero-downtime deployment strategies and implementation
- **[Style Guide](./STYLE_GUIDE.md)** - Code style standards, linting, and formatting rules
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Workflow for autonomous development agents
- **[Environment Parity](./ENVIRONMENT_PARITY.md)** - Maintaining consistency across environments
- **[Migrations Guide](./MIGRATIONS.md)** - Database migration management
- **[Backup & Restore](./BACKUP_RESTORE.md)** - Database backup and recovery procedures

## 🧪 Testing

This project includes **200+ comprehensive end-to-end test cases** covering:

- ✅ **Functional Requirements** - All features and user flows
- 🎨 **UI/UX Requirements** - Design system and responsive layouts
- 🔒 **Security Requirements** - Authentication, authorization, and data protection
- ⚡ **Performance Requirements** - Speed and scalability targets
- ♿ **Accessibility Requirements** - WCAG compliance and screen reader support

See `feature_list.json` for the complete feature list and testing steps.

## 🔄 Development Workflow

This project uses an **autonomous development approach** with multiple agent sessions:

### For Current Session

1. ✅ Review `feature_list.json` to understand all features
2. ✅ Implement features one at a time, starting with highest priority
3. ✅ Test thoroughly before marking `"passes": true`
4. ✅ Commit frequently with descriptive messages
5. ✅ Create progress summary before session ends

### For Future Agents

**CRITICAL RULES:**

- 📋 `feature_list.json` is the single source of truth
- 🚫 **NEVER** remove or edit feature descriptions
- 🚫 **NEVER** modify testing steps
- ✅ **ONLY** change `"passes": false` to `"passes": true` when tested
- 🎯 Work on features with satisfied dependencies first
- 💾 Commit progress frequently
- 📝 Update `claude-progress.txt` at end of session

### Key Pages & Routes

| Route                  | Description                         |
| ---------------------- | ----------------------------------- |
| `/`                    | Landing page with hero and features |
| `/dashboard`           | Repository list and management      |
| `/repos/[id]`          | Documentation viewer with TOC       |
| `/repos/[id]/chat`     | AI chat interface                   |
| `/repos/[id]/settings` | Repository settings and controls    |
| `/settings`            | User profile and preferences        |

## 🎯 Performance Targets

- ⚡ **Documentation Generation**: < 5 minutes for repos with <10K lines
- 🔍 **Search Response**: < 200ms
- 💬 **Chat Response**: < 3 seconds
- 📦 **Repository Support**: Up to 100K lines of code
- 🚀 **Uptime SLA**: 99.9% for paid plans

## 🔒 Security Features

- ✅ GitHub OAuth authentication
- ✅ JWT-based session management
- ✅ CSRF protection on state-changing operations
- ✅ SQL injection prevention via parameterized queries
- ✅ XSS protection with input sanitization
- ✅ Secure HTTP headers (CSP, X-Frame-Options, HSTS)
- ✅ Rate limiting on API endpoints
- ✅ Webhook signature validation
- ✅ Environment variable protection
- ✅ Dependency security audits

## 🤝 Contributing

This is an autonomous development project. Future coding agents should:

1. Read `feature_list.json` to see what needs building
2. Check dependencies before starting a feature
3. Implement one feature at a time
4. Test thoroughly using the provided test steps
5. Mark `"passes": true` only when fully working
6. Commit with clear, descriptive messages
7. Leave clear notes in `claude-progress.txt`

## 📄 License

MIT

---

**Built with ❤️ using Claude AI and autonomous development practices**
