#!/bin/bash

# Script để fix vấn đề truy cập NodePort trong VLAN 100
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=== Kiểm tra và Fix NodePort Access ==="

# 1. Kiểm tra namespace
log_info "1. Kiểm tra namespace..."
kubectl get namespace app
log_success "Namespace app tồn tại"

# 2. Kiểm tra pods
log_info "2. Kiểm tra pods..."
kubectl get pods -n app -o wide
POD_STATUS=$(kubectl get pods -n app -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NOT_FOUND")
if [ "$POD_STATUS" = "Running" ]; then
    log_success "Pod đang chạy"
else
    log_error "Pod không chạy. Status: $POD_STATUS"
    exit 1
fi

# 3. Kiểm tra service
log_info "3. Kiểm tra service..."
kubectl get svc -n app -o wide
NODE_PORT=$(kubectl get svc nodeapp-service -n app -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "NOT_FOUND")
if [ "$NODE_PORT" = "30080" ]; then
    log_success "NodePort 30080 đã được cấu hình"
else
    log_error "NodePort không đúng. Hiện tại: $NODE_PORT"
    exit 1
fi

# 4. Kiểm tra node IP
log_info "4. Kiểm tra node IP..."
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "NOT_FOUND")
if [ "$NODE_IP" != "NOT_FOUND" ]; then
    log_success "Node IP: $NODE_IP"
else
    log_warning "Không tìm thấy Node IP, thử cách khác..."
    NODE_IP=$(hostname -I | awk '{print $1}')
    log_info "Sử dụng IP local: $NODE_IP"
fi

# 5. Kiểm tra port có đang listen không
log_info "5. Kiểm tra port 30080..."
if netstat -tlnp | grep :30080 > /dev/null; then
    log_success "Port 30080 đang listen"
else
    log_warning "Port 30080 không listen, có thể cần restart service"
fi

# 6. Test kết nối local
log_info "6. Test kết nối local..."
if curl -s http://localhost:30080 > /dev/null; then
    log_success "Localhost:30080 hoạt động"
else
    log_error "Localhost:30080 không hoạt động"
fi

# 7. Test kết nối qua IP
log_info "7. Test kết nối qua IP..."
if curl -s http://$NODE_IP:30080 > /dev/null; then
    log_success "IP $NODE_IP:30080 hoạt động"
else
    log_warning "IP $NODE_IP:30080 không hoạt động"
fi

# 8. Restart service nếu cần
log_info "8. Restart service để đảm bảo..."
kubectl rollout restart deployment/nodeapp -n app
kubectl rollout status deployment/nodeapp -n app --timeout=120s
log_success "Service đã được restart"

# 9. Kiểm tra firewall
log_info "9. Kiểm tra firewall..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        log_warning "UFW đang active, kiểm tra port 30080..."
        if ufw status | grep -q "30080"; then
            log_success "Port 30080 đã được mở trong UFW"
        else
            log_warning "Port 30080 chưa được mở trong UFW"
            log_info "Chạy: sudo ufw allow 30080"
        fi
    fi
fi

# 10. Kết quả cuối cùng
echo ""
log_success "=== KẾT QUẢ ==="
log_info "Để truy cập app trong VLAN 100, sử dụng:"
echo "  http://$NODE_IP:30080"
echo ""
log_info "Nếu không được, thử các bước sau:"
echo "  1. Mở firewall: sudo ufw allow 30080"
echo "  2. Restart kubelet: sudo systemctl restart kubelet"
echo "  3. Kiểm tra network: ping $NODE_IP"
echo ""
log_info "Để test từ máy khác trong VLAN:"
echo "  curl http://$NODE_IP:30080"
