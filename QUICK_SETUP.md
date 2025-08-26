# 🚀 Quick Setup - CI/CD cho Thuchi App

## ⚡ Tóm tắt nhanh 5 phút

### 1. Cập nhật thông tin repository

```bash
# Repository đã được cập nhật với Hieupcadsc/thuchi
# find . -name "*.yaml" -o -name "*.yml" -o -name "*.md" | xargs sed -i 's/OWNER\/REPO/hieupcadsc\/thuchi/g'
```

### 2. Setup GitHub Self-hosted Runner

```bash
# Trên máy chủ Linux có Kubernetes
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Cấu hình (lấy token từ GitHub repo > Settings > Actions > Runners)
./config.sh --url https://github.com/Hieupcadsc/thuchi --token YOUR_TOKEN
./run.sh
```

### 3. Test deployment thủ công

```bash
# Cấp quyền và test
chmod +x deploy-k8s.sh
make check
make deploy
```

### 4. Setup tự động

```bash
# Push code lên GitHub
git add .
git commit -m "feat: add kubernetes deployment"
git push origin main
```

## 🎯 Các lệnh thường dùng

```bash
# Kiểm tra trạng thái
make status

# Xem logs
make logs

# Restart app
make restart

# Scale app
make scale REPLICAS=3

# Port forward để test
make port-forward

# Backup database
make backup-db

# Cleanup toàn bộ
make clean
```

## 🔧 Truy cập ứng dụng

Sau khi deploy thành công:

```bash
# Lấy IP và Port
kubectl -n thuchi-app get svc

# Hoặc dùng NodePort (mặc định 30080)
curl http://NODE_IP:30080
```

## 📱 URLs quan trọng

- **App**: `http://NODE_IP:30080`
- **GitHub Actions**: `https://github.com/Hieupcadsc/thuchi/actions`
- **Kubernetes Dashboard**: `kubectl proxy` (nếu có cài)

## 🆘 Troubleshooting

```bash
# Logs chi tiết
kubectl -n thuchi-app describe pod POD_NAME
kubectl -n thuchi-app logs POD_NAME

# Events
kubectl -n thuchi-app get events --sort-by='.metadata.creationTimestamp'

# Resource usage
kubectl -n thuchi-app top pods
```

## ✅ Checklist

- [x] Cập nhật repository name trong tất cả files (hieupcadsc/thuchi)
- [ ] Setup GitHub Self-hosted Runner
- [ ] Test deployment thủ công thành công
- [ ] GitHub Actions workflow chạy thành công
- [ ] Truy cập được ứng dụng qua NodePort
- [ ] Database hoạt động bình thường
- [ ] Monitoring và logs OK

---

📚 **Chi tiết đầy đủ**: Xem file `KUBERNETES_DEPLOYMENT.md`
