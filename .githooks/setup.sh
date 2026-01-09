#!/bin/bash
# SplitBuddy Git Hooks Setup Script
# Chạy script này để cài đặt git hooks

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up SplitBuddy git hooks...${NC}"

# Navigate to project root
cd "$(dirname "$0")/.."

# Configure git to use custom hooks directory
git config core.hooksPath .githooks

# Make hooks executable
chmod +x .githooks/pre-commit

echo -e "${GREEN}✅ Git hooks installed successfully!${NC}"
echo ""
echo "Pre-commit hook will now:"
echo "  📦 Auto-format Rust code with 'cargo fmt'"
echo "  📦 Auto-fix TypeScript with 'eslint --fix'"
echo "  🔍 Run clippy checks for Rust"
echo "  🔍 Run type-check for TypeScript"
echo "  🔨 Verify frontend build"
echo ""
echo "To disable temporarily: git commit --no-verify"
