# 🔌 Hướng dẫn thiết lập theo dõi số điện EVN tự động

## 📋 Tổng quan
Hệ thống theo dõi số điện từng ngày từ EVN Việt Nam đã được tích hợp vào **Smart Hub** của ứng dụng Thuchi. Bao gồm:

- **Script Python**: Lấy dữ liệu EVN (EVNHCMC, EVNHANOI, EVNNPC, EVNCPC, EVNSPC)
- **API Backend**: Tích hợp vào NextJS API routes
- **UI Component**: Hiển thị dữ liệu trong Smart Hub
- **Cron Job**: Tự động chạy mỗi ngày

---

## 🛠️ Files đã tạo

### 1. **Script Python chính**
- `evn_daily_simple.py` - Script có emoji (dùng thủ công)
- `evn_daily_simple_no_emoji.py` - Script không emoji (dùng cho cron)
- `evn_daily_cron.py` - Cron job wrapper với logging

### 2. **Backend API**
- `src/app/api/evn/daily-consumption/route.ts` - API endpoint gọi Python script

### 3. **Frontend Component**
- `src/components/dashboard/ElectricityMonitor.tsx` - UI component hiển thị dữ liệu
- Đã tích hợp vào `src/app/smart-hub/page.tsx`

### 4. **Data Files**
- `evn_daily_data.json` - Dữ liệu mới nhất
- `evn_daily_data_YYYYMMDD_HHMMSS.json` - Backup theo ngày
- `evn_daily.log` - Log cron job

---

## ⚙️ Cấu hình tài khoản EVN

Đã cấu hình sẵn trong script:
```python
USERNAME = "0906658599"
PASSWORD = "!QAZ2wsx11"  
CUSTOMER_ID = "PE0400065097"
REGION = "EVNHCMC"  # Tự động detect cho TP.HCM
```

---

## 🔄 Thiết lập Cron Job tự động

### **Trên Windows (Task Scheduler)**

1. **Mở Task Scheduler** (`taskschd.msc`)

2. **Tạo Task mới**:
   - Tên: `EVN Daily Data Collector`
   - Chạy với quyền cao nhất: ✅
   - Chạy khi user không đăng nhập: ✅

3. **Triggers** (Lịch chạy):
   ```
   Hàng ngày lúc 08:00 AM
   Hàng ngày lúc 20:00 PM
   ```

4. **Actions** (Hành động):
   ```
   Program: C:\Python313\python.exe
   Arguments: C:\Code\Nodejs\thuchi\evn_daily_cron.py
   Start in: C:\Code\Nodejs\thuchi
   ```

5. **Settings**:
   - Cho phép chạy on demand: ✅
   - Nếu task fail, restart sau 1 phút: ✅
   - Stop task nếu chạy quá 30 phút: ✅

### **Trên Linux/WSL (Crontab)**

```bash
# Mở crontab
crontab -e

# Thêm dòng này (chạy lúc 8:00 và 20:00 mỗi ngày)
0 8,20 * * * cd /c/Code/Nodejs/thuchi && python3 evn_daily_cron.py >> evn_cron.log 2>&1
```

---

## 📱 Sử dụng trong ứng dụng

### **Smart Hub Dashboard**
1. Mở **Smart Hub** trong ứng dụng
2. Xem widget **"Theo dõi điện năng"**
3. Click **"Làm mới"** để lấy dữ liệu mới từ API

### **Dữ liệu hiển thị**
- ✅ **Trạng thái**: `success` (thực) / `mock_data` (demo) / `fallback` (lỗi)
- ⚡ **Tổng sản lượng**: kWh tháng hiện tại
- 💰 **Tổng tiền ước tính**: VNĐ
- 📊 **Trung bình/ngày**: kWh
- 📅 **Dữ liệu 7 ngày gần nhất**: Chi tiết từng ngày

---

## 🔍 Kiểm tra & Debug

### **Chạy thủ công**
```bash
# Chạy script trực tiếp
python evn_daily_simple.py

# Chạy cron job
python evn_daily_cron.py

# Kiểm tra log
type evn_daily.log
```

### **Test API**
```bash
# Test qua browser hoặc Postman
POST http://localhost:3000/api/evn/daily-consumption
```

### **Kiểm tra file dữ liệu**
```bash
# Xem dữ liệu mới nhất
type evn_daily_data.json

# Liệt kê backup files
dir evn_daily_data_*.json
```

---

## 🚨 Troubleshooting

### **Lỗi thường gặp**

1. **UnicodeEncodeError (Windows)**
   - ✅ **Đã fix**: Dùng `evn_daily_simple_no_emoji.py` cho cron
   - ✅ **Đã fix**: Set `chcp 65001` trong terminal

2. **Không kết nối được EVN**
   - ✅ **Tự động fallback**: Tạo dữ liệu demo nếu API EVN lỗi
   - ✅ **Thử multiple domains**: EVNHCMC + EVNHANOI backup

3. **Task Scheduler không chạy**
   - Kiểm tra user permissions
   - Kiểm tra Python path đúng chưa
   - Xem Windows Event Logs

### **Log analysis**
```bash
# Xem lỗi cron
findstr "ERROR" evn_daily.log

# Xem số lần thành công
findstr "SUCCESS" evn_daily.log

# Xem cảnh báo
findstr "CẢNH BÁO" evn_daily.log
```

---

## 📈 Nâng cấp tương lai

### **Có thể thêm**
1. **Gửi thông báo**: Email/SMS khi lỗi 3 lần liên tiếp
2. **Export Excel**: Báo cáo hàng tháng
3. **So sánh tháng trước**: Phân tích xu hướng tiêu thụ
4. **Cảnh báo tiết kiệm**: Thông báo khi tiêu thụ cao bất thường
5. **Tích hợp IoT**: Kết nối smart meter thực tế

### **API mở rộng**
- `/api/evn/monthly-report` - Báo cáo tháng
- `/api/evn/consumption-analysis` - Phân tích xu hướng
- `/api/evn/cost-prediction` - Dự đoán chi phí

---

## ✅ Tóm tắt setup hoàn thành

- [x] **Script Python**: Hoạt động với EVNHCMC (TP.HCM)
- [x] **API Backend**: Tích hợp `/api/evn/daily-consumption`
- [x] **UI Component**: Hiển thị trong Smart Hub
- [x] **Cron Job**: Setup tự động mỗi ngày 8AM & 8PM
- [x] **Error Handling**: Fallback data khi EVN API lỗi
- [x] **Backup System**: Lưu lịch sử 7 ngày
- [x] **Logging**: Chi tiết log cho debug

**📱 Bạn có thể vào Smart Hub để xem dữ liệu điện năng ngay bây giờ!** 