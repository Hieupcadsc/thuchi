#!/bin/bash

# Script đơn giản để mở NodePort 30080
echo "=== Mở NodePort 30080 cho VLAN 100 ==="

# 1. Mở firewall
echo "1. Mở firewall port 30080..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 30080/tcp
    echo "✅ UFW: Port 30080 đã được mở"
else
    echo "⚠️  UFW không được cài đặt"
fi

# 2. Kiểm tra iptables
echo "2. Kiểm tra iptables..."
if sudo iptables -L | grep -q "30080"; then
    echo "✅ iptables: Port 30080 đã được mở"
else
    echo "⚠️  iptables: Port 30080 chưa được mở"
fi

# 3. Restart kubelet
echo "3. Restart kubelet..."
sudo systemctl restart kubelet
echo "✅ kubelet đã được restart"

# 4. Kiểm tra service
echo "4. Kiểm tra service..."
kubectl get svc -n app
echo ""

# 5. Lấy IP
NODE_IP=$(hostname -I | awk '{print $1}')
echo "5. Node IP: $NODE_IP"
echo ""

# 6. Test kết nối
echo "6. Test kết nối..."
if curl -s http://localhost:30080 > /dev/null; then
    echo "✅ Localhost:30080 hoạt động"
else
    echo "❌ Localhost:30080 không hoạt động"
fi

echo ""
echo "=== KẾT QUẢ ==="
echo "Để truy cập app trong VLAN 100:"
echo "  http://$NODE_IP:30080"
echo ""
echo "Nếu vẫn không được, thử:"
echo "  sudo netstat -tlnp | grep 30080"
echo "  kubectl logs -n app deployment/nodeapp"
