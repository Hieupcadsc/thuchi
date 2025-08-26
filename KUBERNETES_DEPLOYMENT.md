# 🚀 Hướng dẫn CI/CD cho Thuchi App trên Kubernetes

## 📋 Tổng quan

Hệ thống CI/CD này sẽ tự động build Docker image và deploy ứng dụng Next.js lên Kubernetes cluster khi có code mới được push lên GitHub.

## 🛠 Chuẩn bị môi trường

### 1. Yêu cầu máy chủ Linux (Kubernetes)

```bash
# Kiểm tra Kubernetes cluster đang hoạt động
kubectl cluster-info

# Kiểm tra nodes
kubectl get nodes

# Kiểm tra storage classes có sẵn
kubectl get storageclass
```

### 2. Cấu hình GitHub Runner (Self-hosted)

Trên máy chủ Linux có Kubernetes:

```bash
# Tạo thư mục cho GitHub Runner
mkdir -p ~/actions-runner && cd ~/actions-runner

# Download GitHub Runner (thay YOUR_REPO_URL)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Cấu hình runner (làm theo hướng dẫn từ GitHub repo > Settings > Actions > Runners)
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN

# Chạy runner
./run.sh
```

### 3. Cập nhật repository name

Sửa file `.github/workflows/ci-cd.yaml` và `k8s/deployment.yaml`:

```bash
# Thay thế OWNER/REPO bằng username/repository thực tế  
# Đã được cập nhật với Hieupcadsc/thuchi
# sed -i 's/OWNER\/REPO/hieupcadsc\/thuchi/g' .github/workflows/ci-cd.yaml
# sed -i 's/OWNER\/REPO/hieupcadsc\/thuchi/g' k8s/deployment.yaml
```

## 🔧 Cấu hình Environment Variables

### Tạo GitHub Secrets

Vào GitHub repository > Settings > Secrets and variables > Actions, thêm:

- `KUBE_CONFIG`: nội dung file kubeconfig (nếu cần)
- Các environment variables khác cho ứng dụng

### Cập nhật ConfigMap

Sửa file `k8s/persistentvolume.yaml` để thêm environment variables:

```yaml
data:
  NODE_ENV: "production"
  PORT: "3000"
  # Thêm các env vars khác ở đây
  DATABASE_URL: "sqlite:///app/data/familybudget.sqlite"
```

## 🚀 Triển khai

### Tự động (Thông qua GitHub Actions)

1. Push code lên branch `main`:
```bash
git add .
git commit -m "feat: update deployment"
git push origin main
```

2. GitHub Actions sẽ tự động:
   - Build và test code
   - Build Docker image
   - Push image lên GitHub Container Registry
   - Deploy lên Kubernetes cluster

### Thủ công (Sử dụng script)

```bash
# Cấp quyền execute cho script
chmod +x deploy-k8s.sh

# Deploy ứng dụng
./deploy-k8s.sh deploy

# Kiểm tra trạng thái
./deploy-k8s.sh status

# Restart deployment
./deploy-k8s.sh restart

# Xóa toàn bộ deployment
./deploy-k8s.sh cleanup
```

## 🔍 Giám sát và Troubleshooting

### Kiểm tra logs

```bash
# Xem logs của pods
kubectl -n thuchi-app logs -f deployment/thuchi-app

# Xem events
kubectl -n thuchi-app get events --sort-by='.metadata.creationTimestamp'

# Describe deployment
kubectl -n thuchi-app describe deployment thuchi-app
```

### Kiểm tra resources

```bash
# Xem tất cả resources
kubectl -n thuchi-app get all

# Kiểm tra PVC
kubectl -n thuchi-app get pvc

# Kiểm tra ConfigMap
kubectl -n thuchi-app get configmap thuchi-config -o yaml
```

### Port forwarding (để test local)

```bash
# Forward port để test từ máy local
kubectl -n thuchi-app port-forward svc/thuchi-app-service 8080:80

# Truy cập: http://localhost:8080
```

## 🔒 Bảo mật

### Container Security

```bash
# Scan Docker image cho vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/src aquasec/trivy image ghcr.io/your-username/your-repo:latest
```

### Kubernetes Security

```bash
# Kiểm tra RBAC permissions
kubectl auth can-i --list --as=system:serviceaccount:thuchi-app:default

# Audit logs
kubectl get events --sort-by='.metadata.creationTimestamp'
```

## 📊 Scaling

### Horizontal Pod Autoscaler

```yaml
# Tạo file k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: thuchi-app-hpa
  namespace: thuchi-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: thuchi-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Manual scaling

```bash
# Scale lên 5 replicas
kubectl -n thuchi-app scale deployment thuchi-app --replicas=5

# Kiểm tra
kubectl -n thuchi-app get pods
```

## 🔄 Rollback

```bash
# Xem deployment history
kubectl -n thuchi-app rollout history deployment/thuchi-app

# Rollback về version trước
kubectl -n thuchi-app rollout undo deployment/thuchi-app

# Rollback về version cụ thể
kubectl -n thuchi-app rollout undo deployment/thuchi-app --to-revision=2
```

## 🧹 Cleanup

```bash
# Xóa namespace và tất cả resources
kubectl delete namespace thuchi-app

# Hoặc sử dụng script
./deploy-k8s.sh cleanup
```

## 📝 Lưu ý quan trọng

1. **Database**: SQLite được lưu trong PersistentVolume, đảm bảo backup thường xuyên
2. **Image Registry**: Sử dụng GitHub Container Registry, đảm bảo repository có quyền package:write
3. **Resource Limits**: Điều chỉnh CPU/Memory limits trong deployment.yaml theo nhu cầu
4. **NodePort**: Port 30080 cần được mở trên firewall nếu muốn truy cập từ bên ngoài
5. **SSL/TLS**: Cần cấu hình Ingress với cert-manager cho HTTPS

## 🆘 Troubleshooting thường gặp

### Pod không start được
```bash
kubectl -n thuchi-app describe pod POD_NAME
kubectl -n thuchi-app logs POD_NAME
```

### Image pull errors
```bash
# Kiểm tra image có tồn tại không
docker pull ghcr.io/your-username/your-repo:latest

# Kiểm tra registry credentials
kubectl -n thuchi-app get secret
```

### Storage issues
```bash
# Kiểm tra PVC status
kubectl -n thuchi-app get pvc
kubectl -n thuchi-app describe pvc thuchi-data-pvc
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. GitHub Actions logs
2. Kubernetes events: `kubectl get events --sort-by='.metadata.creationTimestamp'`
3. Pod logs: `kubectl -n thuchi-app logs -f deployment/thuchi-app`
