# Thu Chi Gia Đình - Family Finance Manager

Ứng dụng quản lý tài chính gia đình với NextJS + Firebase + Tailwind CSS.

## 🌟 Tính năng chính

- 📊 **Dashboard tổng quan** - Theo dõi thu chi, biểu đồ, insights
- 💰 **Quản lý giao dịch** - Thêm, sửa, xóa các khoản thu chi
- 🏦 **Quản lý khoản vay** - Theo dõi nợ, trả góp
- 📈 **Báo cáo phân tích** - Charts, so sánh theo tháng
- 📝 **Sticky Notes** - Ghi chú gia đình với drag & drop
- 🏠 **Smart Hub** - Trung tâm điều khiển thông minh
- ⚙️ **Cài đặt** - Điều chỉnh số dư, backup/restore

## 📱 Responsive Design

- ✅ **Desktop** - Tối ưu cho Full HD (1920x1080+)
- ✅ **Tablet** - iPad và Android tablets
- ✅ **Mobile** - iPhone và Android phones
- 🎨 **Modern UI** - Clean, professional, user-friendly

## FAQ (Câu hỏi thường gặp)

### Giao diện có tối ưu cho màn hình lớn không?
- ĐÃ tối ưu cho Full HD (1920x1080) và cả màn hình lớn hơn.
- Font chữ, spacing, icon, card đều lớn và rõ ràng, màu sắc hiện đại, dễ nhìn cho người lớn tuổi.
- Nếu giao diện bị vỡ hoặc xấu, hãy thử clear cache trình duyệt hoặc nhấn Ctrl+F5.
- Nếu vẫn không đẹp, liên hệ Hieu để được hỗ trợ.

---

## 📝 Changelog

### 🗓️ **09/07/2025** - Sticky Notes Enhancement

#### ✨ **New Features**
- 🔄 **Drag & Drop** - Kéo thả notes để sắp xếp vị trí tùy ý
- 🇻🇳 **Vietnamese Input Fix** - Hoàn toàn sửa lỗi gõ tiếng Việt với dấu thanh
- 🪟 **Windows-style UI** - Thiết kế clean giống Windows Sticky Notes

#### 🛠️ **Technical Improvements**  
- ✅ Thay `contentEditable` → `textarea` để fix Vietnamese IME
- ✅ Loại bỏ complex key interception logic
- ✅ CSS force direction LTR cho Vietnamese text
- ✅ Tối ưu drag & drop với visual feedback
- ✅ Đơn giản hóa UI - xóa buttons thừa và notifications

#### 🎯 **Bug Fixes**
- 🐛 Fix text direction bị reverse khi gõ tiếng Việt
- 🐛 Fix dấu thanh (à, á, ả, ã, ạ) không hiển thị đúng
- 🐛 Cải thiện performance với textarea thay vì contentEditable

#### 📋 **User Experience**
- 🎨 Clean header design (xóa gradient, borders thừa)  
- 🗑️ Xóa Clear/Reset buttons (giống Windows)
- ⚡ Chỉ giữ core functions: edit, pin, minimize, delete
- 🖱️ Double-click để edit, drag để move
- 💾 Auto-save silent, không spam notifications
