#!/bin/bash

echo "🔐 Enabling SSH access on N100 server..."

# Install SSH server
echo "📦 Installing OpenSSH server..."
sudo apt update
sudo apt install -y openssh-server

# Enable SSH service
echo "🚀 Starting SSH service..."
sudo systemctl enable ssh
sudo systemctl start ssh

# Check status
echo "✅ SSH service status:"
sudo systemctl status ssh --no-pager

# Configure firewall
echo "🛡️ Configuring firewall..."
sudo ufw allow ssh
sudo ufw --force enable

# Show SSH configuration
echo "📋 SSH configuration:"
echo "SSH Port: $(grep "^Port" /etc/ssh/sshd_config | cut -d' ' -f2 || echo "22 (default)")"
echo "PasswordAuthentication: $(grep "^PasswordAuthentication" /etc/ssh/sshd_config | cut -d' ' -f2 || echo "yes (default)")"

# Show network info
echo "🌐 Network information:"
echo "Local IP: $(hostname -I | awk '{print $1}')"
echo "Public IP: $(curl -s ifconfig.me || echo "Unable to detect")"

# Create SSH key if doesn't exist
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "📋 Your public key:"
    cat ~/.ssh/id_rsa.pub
else
    echo "🔑 SSH key already exists:"
    cat ~/.ssh/id_rsa.pub
fi

echo ""
echo "✅ SSH setup completed!"
echo "🔗 To connect from outside:"
echo "   ssh $(whoami)@YOUR_PUBLIC_IP"
echo ""
echo "🏠 To connect from local network:"
echo "   ssh $(whoami)@$(hostname -I | awk '{print $1}')"
echo ""
echo "📝 Next steps:"
echo "1. Configure router port forwarding: 22 -> $(hostname -I | awk '{print $1}'):22"
echo "2. Use strong password or SSH keys"
echo "3. Consider changing default SSH port (22) for security" 