#!/bin/bash

echo "🔧 Fixing N100 server setup..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in thuchi directory. Please cd to ~/thuchi first"
    exit 1
fi

# Kill any existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Verify Node.js installation
echo "✅ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install PM2 if not available
if ! command -v pm2 &> /dev/null; then
    echo "⚡ Installing PM2..."
    npm install -g pm2
fi

# Pull latest code and rebuild
echo "📥 Updating code..."
git pull origin thuchi
npm install
npm run build

# Create basic Nginx config without SSL first
echo "🌐 Creating basic Nginx config..."
sudo tee /etc/nginx/sites-available/thuchi > /dev/null <<'EOF'
server {
    listen 80;
    server_name thuchi.hieungo.uk;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
}
EOF

# Enable site and remove default
sudo ln -sf /etc/nginx/sites-available/thuchi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
echo "🧪 Testing Nginx config..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config OK, restarting..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo "❌ Nginx config failed!"
    exit 1
fi

# Update ecosystem.config.js with current path
echo "📝 Updating PM2 config..."
sed -i "s|/home/user/thuchi|$(pwd)|g" ecosystem.config.js

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save

# Setup SSL if certbot is available and not already configured
if command -v certbot &> /dev/null; then
    if [ ! -f "/etc/letsencrypt/live/thuchi.hieungo.uk/fullchain.pem" ]; then
        echo "🔒 Setting up SSL certificate..."
        sudo certbot --nginx -d thuchi.hieungo.uk --non-interactive --agree-tos --email hieupcadsc@gmail.com || echo "⚠️ SSL setup failed, but HTTP should work"
    else
        echo "✅ SSL certificate already exists"
    fi
fi

echo ""
echo "✅ Fix completed!"
echo "📊 Current status:"
pm2 status
echo ""
echo "🌐 Nginx status:"
sudo systemctl status nginx --no-pager | head -10
echo ""
echo "🔗 Test your app:"
echo "HTTP: http://thuchi.hieungo.uk"
echo "HTTPS: https://thuchi.hieungo.uk"
echo ""
echo "📝 Server IP: $(hostname -I | awk '{print $1}')"
echo "📝 Configure router NAT: 80,443 -> $(hostname -I | awk '{print $1}'):80,443" 