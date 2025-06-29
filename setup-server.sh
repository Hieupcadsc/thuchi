#!/bin/bash

echo "🔧 Setting up N100 server for thuchi app..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (fix installation)
echo "📥 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Checking Node.js version..."
node --version
npm --version

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL
echo "🔒 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Install PM2
echo "⚡ Installing PM2..."
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
echo "⚠️  Run the generated command above with sudo, then press Enter to continue..."
read -p "Press Enter after running the PM2 startup command..."

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Handle existing repository
echo "📂 Setting up repository..."
if [ -d "thuchi" ]; then
    echo "⚠️  Directory thuchi exists, backing up..."
    mv thuchi thuchi.backup.$(date +%Y%m%d_%H%M%S)
fi

git clone https://github.com/Hieupcadsc/thuchi.git
cd thuchi

# Install dependencies and build
echo "🔨 Installing dependencies and building..."
npm install
npm run build

# Create basic Nginx config without SSL first
echo "🌐 Setting up basic Nginx config..."
sudo tee /etc/nginx/sites-available/thuchi > /dev/null <<EOF
server {
    listen 80;
    server_name thuchi.hieungo.uk;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/thuchi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
echo "🧪 Testing Nginx config..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config OK"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo "❌ Nginx config failed!"
    exit 1
fi

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save

# Setup SSL with Certbot (after nginx is working)
echo "🔒 Setting up SSL certificate..."
sudo certbot --nginx -d thuchi.hieungo.uk --non-interactive --agree-tos --email hieupcadsc@gmail.com

# Update ecosystem.config.js path
echo "📝 Updating PM2 config path..."
sed -i "s|/home/user/thuchi|$(pwd)|g" ecosystem.config.js
pm2 restart thuchi-app

echo "✅ Setup completed!"
echo "📊 Current status:"
pm2 status
echo ""
echo "🌐 Nginx status:"
sudo systemctl status nginx --no-pager
echo ""
echo "📝 Next steps:"
echo "1. Configure router NAT: Port 80,443 -> $(hostname -I | awk '{print $1}'):80,443"
echo "2. Update DNS: thuchi.hieungo.uk -> your_public_ip"
echo "3. Test HTTP: http://thuchi.hieungo.uk"
echo "4. Test HTTPS: https://thuchi.hieungo.uk"

# Make deploy script executable
chmod +x deploy.sh

echo "🎉 Ready to deploy! Use ./deploy.sh for updates" 