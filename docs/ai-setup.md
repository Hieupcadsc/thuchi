# AI Setup cho Bill Processing

## Cài đặt Google AI API

Để sử dụng tính năng AI xử lý hóa đơn/bill, bạn cần:

### 1. Lấy Google AI API Key

1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Đăng nhập với tài khoản Google
3. Tạo API key mới
4. Copy API key

### 2. Tạo file Environment Variables

Tạo file `.env.local` trong thư mục gốc của project với nội dung:

```env
# Google AI API Key for Genkit (có thể dùng 1 trong 2 tên biến)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
# hoặc
GEMINI_API_KEY=your_google_ai_api_key_here

# Next.js (optional)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:9002
```

**Lưu ý**: Code sẽ tự động detect cả `GOOGLE_AI_API_KEY` và `GEMINI_API_KEY`.

### 3. Chạy Genkit Development Server

Để test AI flows riêng biệt:

```bash
npm run genkit:dev
```

Genkit UI sẽ mở tại: http://localhost:4000

### 4. Test API

API endpoint cho bill processing: `/api/ai/process-bill`

**Request:**
```json
{
  "imageDataUri": "data:image/jpeg;base64,..."
}
```

**Response thành công:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 248000,
    "transactionDate": "2025-01-21",
    "description": "Nhà hàng hải sản",
    "note": "Cà ngã gha rang muối 39k, Ốc lái háp thái 15k, Nghêu Bắc háp xả 15k, Mì xào bạch tuộc 30k, Hàu sữa nướng phô mai 18k..."
  }
}
```

**Response fallback khi AI lỗi:**
```json
{
  "success": true,
  "data": {...},
  "warning": "AI processing failed, using fallback data. Please try again or manually enter the transaction."
}
```

## Recent Fixes (v2.1)

### ✅ Enhanced Item Detail Extraction
- **New Feature**: AI giờ extract chi tiết từng món trong bill
- **Auto Note**: Tự động điền note field với danh sách các món + giá
- **Format**: "Món A 15k, Món B 30k, Món C 25k..." 
- **Benefit**: Track chi tiết chi tiêu, dễ review sau này

## Previous Fixes (v2.0)

### ✅ JSON Parsing Fix
- **Problem**: AI trả về JSON với markdown code blocks (`\`\`\`json`)
- **Solution**: Auto-detect và remove markdown formatting trước khi parse JSON
- **Result**: Giờ AI có thể trả về format nào cũng được handle

### ✅ API Key Support
- **Support**: Cả `GOOGLE_AI_API_KEY` và `GEMINI_API_KEY`
- **Flexible**: Code tự động detect environment variable có sẵn

### ✅ Better Prompting
- **Improved**: Prompt rõ ràng hơn, yêu cầu AI không dùng markdown
- **Fallback**: Vẫn handle được nếu AI ignore instruction

## Troubleshooting

### AI không hoạt động
- Kiểm tra API key có đúng không
- Kiểm tra internet connection
- Xem console logs để debug
- Kiểm tra environment variable name (`GOOGLE_AI_API_KEY` hoặc `GEMINI_API_KEY`)

### JSON Parsing Error (Fixed)
- ~~Problem: AI returns markdown code blocks~~ ✅ **FIXED**
- Code tự động remove markdown formatting

### Invalid Image Error
- Đảm bảo image là format hợp lệ (JPEG, PNG)
- Kiểm tra base64 encoding đúng
- Try với ảnh khác nếu vẫn lỗi

### Fallback mode
- Nếu AI fails, hệ thống sẽ tự động chuyển sang mock data
- User vẫn có thể sử dụng ứng dụng bình thường
- Thử lại sau hoặc nhập thủ công

## Dependencies

- `@genkit-ai/googleai`: Google AI integration
- `@genkit-ai/express`: Genkit server
- `genkit`: Core Genkit framework 