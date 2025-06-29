#!/bin/bash

echo "🔍 Checking GitHub repository status..."

# Get repository URL
REPO_URL=$(git config --get remote.origin.url)

if [ -z "$REPO_URL" ]; then
    echo "❌ No remote origin found!"
    echo "📝 Setup remote with:"
    echo "   git remote add origin https://github.com/Hieupcadsc/thuchi.git"
    exit 1
fi

echo "📂 Repository URL: $REPO_URL"

# Extract owner and repo name
if [[ "$REPO_URL" =~ github.com[:/]([^/]+)/([^/]+)(.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]%.git}"
    
    echo "👤 Owner: $OWNER"
    echo "📁 Repository: $REPO"
    
    # Check if repo is public by trying to access without auth
    PUBLIC_URL="https://api.github.com/repos/$OWNER/$REPO"
    
    if curl -s "$PUBLIC_URL" | grep -q '"private":false'; then
        echo "✅ Repository is PUBLIC"
        echo "🌐 Can be accessed at: https://github.com/$OWNER/$REPO"
        echo "📥 Clone URL: https://github.com/$OWNER/$REPO.git"
    elif curl -s "$PUBLIC_URL" | grep -q '"private":true'; then
        echo "🔒 Repository is PRIVATE"
        echo "📝 To make it public:"
        echo "   1. Go to https://github.com/$OWNER/$REPO/settings"
        echo "   2. Scroll to 'Danger Zone'"
        echo "   3. Click 'Change visibility' -> 'Make public'"
    else
        echo "❓ Unable to determine repository visibility"
        echo "🔍 Check manually: https://github.com/$OWNER/$REPO"
    fi
else
    echo "❌ Invalid GitHub URL format"
fi

# Check if we can clone without auth (for N100 setup)
echo ""
echo "🧪 Testing public clone access..."
TEMP_DIR="/tmp/test-clone-$$"
if git clone --depth 1 "https://github.com/Hieupcadsc/thuchi.git" "$TEMP_DIR" 2>/dev/null; then
    echo "✅ Repository can be cloned publicly"
    rm -rf "$TEMP_DIR"
else
    echo "❌ Repository requires authentication to clone"
    echo "📝 Either make it public or setup SSH keys on N100"
fi 