#!/bin/bash

# AutoDocs AI - Development Environment Setup Script
# This script sets up and runs the development environment

set -e  # Exit on error

echo "=========================================="
echo "AutoDocs AI - Environment Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version 18 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

# Create .env files if they don't exist
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql://localhost:5432/autodocs_dev

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=autodocs

# JWT Secret
JWT_SECRET=your_jwt_secret_change_in_production

# Backend URL
BACKEND_URL=http://localhost:3001

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
    echo -e "${YELLOW}⚠ Please update .env.local with your actual API keys${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# Create backend .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creating backend/.env file...${NC}"
    mkdir -p backend
    cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://localhost:5432/autodocs_dev

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=autodocs

# JWT Secret
JWT_SECRET=your_jwt_secret_change_in_production

# Server
PORT=3001
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ Created backend/.env${NC}"
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

echo ""

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL detected${NC}"
    echo -e "${YELLOW}Make sure PostgreSQL is running and the database 'autodocs_dev' exists${NC}"
    echo "  To create the database, run: createdb autodocs_dev"
else
    echo -e "${YELLOW}⚠ PostgreSQL not detected in PATH${NC}"
    echo "  Please install PostgreSQL or ensure it's running"
fi

echo ""
echo "=========================================="
echo "Installing Dependencies"
echo "=========================================="
echo ""

# Install frontend dependencies
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

# Install backend dependencies
if [ -f "backend/package.json" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Update API keys in .env.local and backend/.env"
echo ""
echo "2. Set up your PostgreSQL database:"
echo "   createdb autodocs_dev"
echo "   cd backend && npm run migrate"
echo ""
echo "3. Set up your Pinecone index:"
echo "   - Go to https://www.pinecone.io/"
echo "   - Create an index named 'autodocs'"
echo "   - Use dimension 1536 (for OpenAI embeddings)"
echo ""
echo "4. Set up GitHub OAuth:"
echo "   - Go to https://github.com/settings/developers"
echo "   - Create a new OAuth App"
echo "   - Set Authorization callback URL to: http://localhost:3000/api/auth/callback"
echo "   - Copy Client ID and Client Secret to your .env files"
echo ""
echo "5. Get your Claude API key:"
echo "   - Go to https://console.anthropic.com/"
echo "   - Generate an API key"
echo "   - Add it to your .env files"
echo ""
echo -e "${GREEN}To start the development servers:${NC}"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "=========================================="
