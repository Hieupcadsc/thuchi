import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🔌 API EVN: Bắt đầu lấy dữ liệu điện từng ngày...')
    
    // Path tới script Python với dữ liệu thật
    const scriptPath = path.join(process.cwd(), 'evn_daily_real_data.py')
    const outputPath = path.join(process.cwd(), 'evn_daily_data.json')
    
    // Kiểm tra script có tồn tại không
    try {
      await fs.access(scriptPath)
    } catch (error) {
      console.error('❌ Không tìm thấy script Python:', scriptPath)
      return NextResponse.json(
        { 
          error: 'Script Python không tồn tại',
          path: scriptPath 
        },
        { status: 500 }
      )
    }
    
    // Chạy script Python
    const pythonProcess = spawn('python', [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    // Đợi script hoàn thành
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve)
    })
    
    console.log('🐍 Python script output:', stdout)
    if (stderr) {
      console.warn('⚠️ Python script stderr:', stderr)
    }
    
    // Đọc file kết quả
    try {
      const jsonData = await fs.readFile(outputPath, 'utf-8')
      const evnData = JSON.parse(jsonData)
      
      console.log('✅ Đã lấy dữ liệu EVN thành công')
      
      return NextResponse.json({
        success: true,
        data: evnData,
        logs: {
          stdout: stdout.split('\n').slice(-10), // 10 dòng cuối
          exitCode
        }
      })
      
    } catch (readError) {
      console.error('❌ Lỗi đọc file kết quả:', readError)
      
      // Trả về dữ liệu demo nếu không đọc được file
      const mockData = {
        status: "api_error",
        timestamp: new Date().toISOString(),
        customer_info: {
          ten_khachhang: "Khách hàng API Demo",
          dia_chi: "TP Hồ Chí Minh",
          ma_congto: "CT123456",
          ma_khachhang: "PE0400065097"
        },
        daily_consumption: {
          data: Array.from({ length: 7 }, (_, i) => ({
            ngay: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
            san_luong: Math.round((12 + Math.random() * 3) * 100) / 100,
            chi_so: 1450 + (i * 12),
            tien_uoc_tinh: Math.round((12 + Math.random() * 3) * 2500)
          })),
          tong_san_luong_thang: 94.5,
          tong_tien_uoc_tinh: 236250
        },
        region: "EVNHCMC",
        customer_id: "PE0400065097",
        note: "Dữ liệu demo từ API vì lỗi đọc file Python!"
      }
      
      return NextResponse.json({
        success: true,
        data: mockData,
        logs: {
          stdout: stdout.split('\n').slice(-10),
          stderr: stderr.split('\n').slice(-5),
          exitCode,
          error: 'Không đọc được file kết quả, trả về dữ liệu demo'
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Lỗi API EVN:', error)
    
    // Trả về dữ liệu demo khi có lỗi
    const fallbackData = {
      status: "fallback",
      timestamp: new Date().toISOString(),
      customer_info: {
        ten_khachhang: "Khách hàng Fallback",
        dia_chi: "TP Hồ Chí Minh",
        ma_congto: "CT123456",
        ma_khachhang: "PE0400065097"
      },
      daily_consumption: {
        data: [
          { ngay: "03/07/2025", san_luong: 12.5, chi_so: 1450, tien_uoc_tinh: 31250 },
          { ngay: "02/07/2025", san_luong: 11.8, chi_so: 1438, tien_uoc_tinh: 29500 },
          { ngay: "01/07/2025", san_luong: 13.2, chi_so: 1426, tien_uoc_tinh: 33000 },
          { ngay: "30/06/2025", san_luong: 12.0, chi_so: 1414, tien_uoc_tinh: 30000 },
          { ngay: "29/06/2025", san_luong: 14.1, chi_so: 1402, tien_uoc_tinh: 35250 }
        ],
        tong_san_luong_thang: 63.6,
        tong_tien_uoc_tinh: 159000
      },
      region: "EVNHCMC",
      customer_id: "PE0400065097",
      note: "Dữ liệu demo vì lỗi hệ thống!"
    }
    
    return NextResponse.json({
      success: false,
      data: fallbackData,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 