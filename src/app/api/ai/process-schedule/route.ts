import { NextRequest, NextResponse } from 'next/server';
import { gemini15Flash } from '@genkit-ai/googleai';
import { ai } from '@/ai/genkit';
import { firestoreService } from '@/lib/firestore-service';
import { format, addDays, parse } from 'date-fns';

interface ShiftInfo {
  code: string;
  startTime: string;
  endTime: string;
  color: string;
}

const SHIFT_TYPES: Record<string, ShiftInfo> = {
  'L2': { code: 'L2', startTime: '14:00', endTime: '23:00', color: '#10B981' }, // Green
  'D2': { code: 'D2', startTime: '06:00', endTime: '14:00', color: '#F59E0B' }, // Yellow
  'T2': { code: 'T2', startTime: '22:00', endTime: '07:00', color: '#EF4444' }, // Red
  'OFF': { code: 'OFF', startTime: '', endTime: '', color: '#6B7280' }, // Gray - Day off
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const familyId = formData.get('familyId') as string;

    if (!imageFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Không tìm thấy file ảnh' 
      }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');

    // Get current date info for context
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Use AI to analyze the work schedule image
    const aiPrompt = `
Bạn là AI chuyên phân tích lịch làm việc. Hãy phân tích ảnh lịch làm việc này và trích xuất thông tin:

THÔNG TIN NGÀY HIỆN TẠI: ${now.toISOString().split('T')[0]} (${currentYear}/${currentMonth})

QUAN TRỌNG - TÌM ĐÚNG NGƯỜI: 
- TÌM CHÍNH XÁC tên "Ngô Minh Hiếu" hoặc "M.Hieu" trong cột Name
- KHÔNG được nhầm với "Nguyễn Minh Tuấn" hay "Nguyễn Ngọc Hiếu" 
- CHỈ lấy lịch làm việc của dòng "Ngô Minh Hiếu"
- Đọc chính xác text trong từng ô của ĐÚNG hàng Minh Hiếu

CÁC LOẠI CA LÀM VIỆC CHO MINH HIẾU:
- L2 (màu xanh lá): Ca chiều 14:00-23:00
- D2 (màu vàng): Ca sáng 06:00-14:00  
- T2 (màu đỏ): Ca tối 22:00-07:00
- OFF (màu xám/trắng): NGHỈ PHÉP - KHÔNG LÀM VIỆC
- Bất kỳ mã khác (E3, AL, CE...) = NGHỈ hoặc không phải Minh Hiếu

QUY TẮC PHÂN TÍCH NGHIÊM NGẶT:
- CHỈ lưu khi thấy RÕ RÀNG trong hàng Minh Hiếu: "L2", "D2", "T2"
- L2 = ca chiều (14:00-23:00)
- D2 = ca sáng (06:00-14:00)  
- T2 = ca tối (22:00-07:00)
- MỌI TRƯỜNG HỢP KHÁC = NGHỈ (không lưu):
  + Text "OFF" = nghỉ phép
  + Text "AL" = nghỉ annual leave
  + Text "E3" = ca của người khác, KHÔNG phải Minh Hiếu
  + Text "CE" = không rõ, coi như nghỉ
  + Ô trống = nghỉ
  + Text không rõ = nghỉ
  + Bất kỳ ký tự nào khác = nghỉ

LOGIC NĂM THÔNG MINH:
- Nếu ảnh không có năm rõ ràng, mặc định sử dụng năm hiện tại: ${currentYear}
- Nếu tháng trong ảnh < tháng hiện tại, có thể là năm sau: ${currentYear + 1}
- Ưu tiên logic: năm hiện tại (${currentYear}) -> năm sau (${currentYear + 1}) -> năm trước (${currentYear - 1})

Định dạng trả về JSON (CHỈ GỒM NHỮNG NGÀY CÓ CA LÀM VIỆC):
{
  "employee": "Ngô Minh Hiếu",
  "month": "số tháng (1-12)",
  "year": ${currentYear}, 
  "schedules": [
    {
      "day": "số ngày (1-31)",
      "shift": "L2|D2|T2",
      "date": "YYYY-MM-DD"
    }
  ]
}

VÍ DỤ THỰC TẾ TRONG HÀNG MINH HIẾU:
- Ngày có text "L2" → Lưu ca chiều
- Ngày có text "D2" → Lưu ca sáng  
- Ngày có text "T2" → Lưu ca tối
- Ngày có text "OFF" → Bỏ qua (nghỉ)
- Ngày có text "AL" → Bỏ qua (nghỉ annual leave)
- Ngày có text "E3" → Bỏ qua (ca của người khác)
- Ngày có text "CE" → Bỏ qua (không rõ)
- Ngày trống hoặc text lạ → Bỏ qua (nghỉ)

NGUYÊN TẮC: Chỉ chắc chắn 100% mới lưu, nghi ngờ thì bỏ qua.

Nếu không tìm thấy thông tin, trả về: {"error": "Không tìm thấy lịch làm việc của Ngô Minh Hiếu"}
`;

    console.log('🤖 Analyzing work schedule image with AI...');
    
    const aiResponse = await ai.generate({
      model: gemini15Flash,
      prompt: [
        {
          text: aiPrompt,
        },
        {
          media: {
            url: `data:image/jpeg;base64,${base64Image}`,
          },
        },
      ],
    });

    console.log('🤖 AI Response:', aiResponse.text);
    
    // Log raw response for debugging
    console.log('🔍 [DEBUG] Raw AI Response Text:', JSON.stringify(aiResponse.text));

    // Parse AI response
    let scheduleData;
    try {
      // Clean the response text to extract JSON
      let cleanedResponse = aiResponse.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      scheduleData = JSON.parse(cleanedResponse);
      console.log('📋 [DEBUG] Parsed schedule data:', JSON.stringify(scheduleData, null, 2));
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('🔍 [DEBUG] Failed to parse response. Raw text:', aiResponse.text);
      return NextResponse.json({
        success: false,
        error: 'AI không thể phân tích ảnh lịch làm việc'
      }, { status: 500 });
    }

    if (scheduleData.error) {
      return NextResponse.json({
        success: false,
        error: scheduleData.error
      }, { status: 400 });
    }

    // Smart year correction logic
    let correctedYear = scheduleData.year;
    const detectedMonth = scheduleData.month;
    
    // If AI detected a year that's too far in the past, auto-correct it
    if (correctedYear < currentYear - 1) {
      console.log(`🤖 AI detected year ${correctedYear}, correcting to ${currentYear}`);
      correctedYear = currentYear;
    }
    
    // If month is in the past and year is current year, might be next year
    if (detectedMonth < currentMonth && correctedYear === currentYear) {
      correctedYear = currentYear + 1;
      console.log(`🤖 Month ${detectedMonth} < current ${currentMonth}, assuming next year ${correctedYear}`);
    }

    // Update scheduleData with corrected year
    scheduleData.year = correctedYear;

    // IMPORTANT: Clear existing schedules for Minh Hiếu in this month before adding new ones
    console.log(`🗑️ Clearing existing schedules for Minh Hiếu in ${correctedYear}/${detectedMonth}...`);
    try {
      await firestoreService.deleteWorkSchedulesByEmployeeAndMonth(
        familyId, 
        'Minh Hiếu', 
        correctedYear, 
        detectedMonth
      );
      console.log(`✅ Cleared existing schedules for Minh Hiếu`);
    } catch (error) {
      console.error('Error clearing existing schedules:', error);
      // Continue anyway - better to have duplicates than fail completely
    }

    // Convert to work schedules
    const workSchedules = [];
    const notifications = [];
    let processedCount = 0;

    for (const schedule of scheduleData.schedules) {
      console.log(`🔍 [DEBUG] Processing day ${schedule.day}: shift="${schedule.shift}"`);
      
      // Only accept exact working shifts for Minh Hiếu: L2, D2, T2
      if (!['L2', 'D2', 'T2'].includes(schedule.shift)) {
        console.log(`⏭️ Skipping non-working day: ${schedule.day} (shift: ${schedule.shift}) - Mặc định nghỉ`);
        continue;
      }
      
      console.log(`✅ [DEBUG] Day ${schedule.day} accepted: shift=${schedule.shift}`);

      const shiftInfo = SHIFT_TYPES[schedule.shift];
      if (!shiftInfo) {
        console.log(`❌ Unknown shift type: ${schedule.shift} for day ${schedule.day}`);
        continue;
      }

      // Reconstruct date with corrected year
      const correctedDate = `${correctedYear}-${String(detectedMonth).padStart(2, '0')}-${String(schedule.day).padStart(2, '0')}`;

      const workSchedule = {
        familyId: familyId,
        employeeName: 'Minh Hiếu' as const,
        title: `Ca ${shiftInfo.code} - ${schedule.shift === 'L2' ? 'Chiều' : schedule.shift === 'D2' ? 'Sáng' : 'Tối'}`,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime,
        date: correctedDate,
        isRecurring: false,
        location: 'Công ty MIS',
        notes: `Ca làm việc ${shiftInfo.code}`,
        color: shiftInfo.color
      };

      // Save to database
      await firestoreService.addWorkSchedule(workSchedule);
      workSchedules.push(workSchedule);
      processedCount++;

      // Create notification
      const shiftName = schedule.shift === 'L2' ? 'ca chiều (14:00-23:00)' : 
                       schedule.shift === 'D2' ? 'ca sáng (06:00-14:00)' : 
                       'ca tối (22:00-07:00)';
      
      notifications.push(`${format(new Date(correctedDate), 'dd/MM')}: ${shiftName}`);
    }

    console.log(`✅ Processed ${processedCount} work schedules for Minh Hiếu (${correctedYear}/${detectedMonth})`);

    return NextResponse.json({
      success: true,
      schedules: workSchedules,
      notifications: notifications,
      summary: {
        employee: scheduleData.employee,
        month: detectedMonth,
        year: correctedYear,
        totalShifts: processedCount
      }
    });

  } catch (error) {
    console.error('Error processing schedule image:', error);
    return NextResponse.json({
      success: false,
      error: 'Lỗi xử lý ảnh lịch làm việc'
    }, { status: 500 });
  }
} 