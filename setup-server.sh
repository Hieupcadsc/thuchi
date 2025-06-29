#!/bin/bash

echo "🔧 Setting up N100 server for thuchi app..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📥 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

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
echo "Run the generated command above with sudo, then continue"

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Clone repository
echo "📂 Cloning repository..."
cd ~
git clone https://github.com/Hieupcadsc/thuchi.git
cd thuchi

# Install dependencies and build
echo "🔨 Installing dependencies and building..."
npm install
npm run build

# Copy Nginx config
echo "🌐 Setting up Nginx..."
sudo cp nginx-thuchi.conf /etc/nginx/sites-available/thuchi
sudo ln -s /etc/nginx/sites-available/thuchi /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
echo "🔒 Getting SSL certificate..."
sudo certbot --nginx -d thuchi.hieungo.uk

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ Setup completed!"
echo "📝 Next steps:"
echo "1. Configure router NAT: Port 80,443 -> N100_IP:80,443"
echo "2. Update DNS: thuchi.hieungo.uk -> your_public_ip"
echo "3. Test: https://thuchi.hieungo.uk"

# Make deploy script executable
chmod +x deploy.sh

echo "🎉 Ready to deploy! Use ./deploy.sh for updates" 