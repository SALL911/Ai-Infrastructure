#!/bin/bash
# Open symcio-entity-builder across all platforms

echo "🏗️  Opening symcio-entity-builder..."

# Local development
echo "📱 Local: http://localhost:3000"

# GitHub Repository
echo "📚 GitHub: https://github.com/SALL911/symcio-entity-builder"

# Vercel Production
echo "🌐 Vercel: https://symcio-entity-builder.vercel.app"

# Open in browser (macOS/Linux)
if command -v open &> /dev/null; then
    open "https://symcio-entity-builder.vercel.app"
    open "https://github.com/SALL911/symcio-entity-builder"
fi

# Open in browser (Windows - WSL)
if command -v wslview &> /dev/null; then
    wslview "https://symcio-entity-builder.vercel.app"
    wslview "https://github.com/SALL911/symcio-entity-builder"
fi

echo "✅ symcio-entity-builder opened successfully"
