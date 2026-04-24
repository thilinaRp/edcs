#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting production build process..."

# 1. Clean previous builds
echo "🧹 Cleaning dist directory..."
npm run clean || true

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build frontend assets
echo "🏗️ Building frontend with Vite..."
npm run build

# 4. Final check
if [ -d "dist" ]; then
    echo "✅ Build successful! Frontend assets are in the 'dist' directory."
    echo "📝 To start the server in production mode, run: NODE_ENV=production npm start"
else
    echo "❌ Build failed: 'dist' directory not found."
    exit 1
fi
