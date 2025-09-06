#!/bin/bash

# Script để chỉnh sửa ingress.yaml trên máy Linux
echo "=== Chỉnh sửa ingress.yaml trên máy Linux ==="

# Đường dẫn đến file ingress.yaml
INGRESS_FILE="k8s/ingress.yaml"

# Backup file gốc
echo "1. Backup file gốc..."
cp $INGRESS_FILE $INGRESS_FILE.backup
echo "✅ Đã backup: $INGRESS_FILE.backup"

# Tạo file ingress.yaml mới với cấu hình đúng
echo "2. Tạo file ingress.yaml mới..."
cat > $INGRESS_FILE << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nodeapp-ingress
  namespace: app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    # Thêm annotation để cho phép truy cập IP trực tiếp
    nginx.ingress.kubernetes.io/server-snippet: |
      server_name _;
spec:
  ingressClassName: nginx
  rules:
  # App 1: Thu Chi App
  - host: thuchi.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodeapp-service
            port:
              number: 80
  # External IP access via nip.io
  - host: 192.168.100.170.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodeapp-service
            port:
              number: 80
  # Direct IP access - QUAN TRỌNG cho VLAN 100
  - host: 192.168.100.170
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodeapp-service
            port:
              number: 80
  # Alternative domain for external access
  - host: thuchi-external.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodeapp-service
            port:
              number: 80
EOF

echo "✅ Đã tạo file ingress.yaml mới"

# Kiểm tra file
echo "3. Kiểm tra file mới..."
if [ -f "$INGRESS_FILE" ]; then
    echo "✅ File tồn tại"
    echo "📄 Nội dung file:"
    cat $INGRESS_FILE
else
    echo "❌ File không tồn tại"
    exit 1
fi

# Apply ingress mới
echo "4. Apply ingress mới..."
kubectl apply -f $INGRESS_FILE
echo "✅ Đã apply ingress"

# Kiểm tra ingress
echo "5. Kiểm tra ingress..."
kubectl get ingress -n app
echo ""

# Kiểm tra service
echo "6. Kiểm tra service..."
kubectl get svc -n app
echo ""

# Lấy IP
NODE_IP=$(hostname -I | awk '{print $1}')
echo "7. Node IP: $NODE_IP"
echo ""

echo "=== KẾT QUẢ ==="
echo "Bây giờ bạn có thể truy cập app qua:"
echo "  🌐 http://192.168.100.170:30080 (NodePort trực tiếp)"
echo "  🌐 http://192.168.100.170 (Qua Ingress)"
echo "  🌐 http://192.168.100.170.nip.io (Qua nip.io)"
echo ""
echo "Để test:"
echo "  curl http://192.168.100.170:30080"
echo "  curl http://192.168.100.170"
echo ""
echo "Nếu cần rollback:"
echo "  cp $INGRESS_FILE.backup $INGRESS_FILE"
echo "  kubectl apply -f $INGRESS_FILE"
