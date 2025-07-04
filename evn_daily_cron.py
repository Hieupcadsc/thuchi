#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cron job script lấy số điện từng ngày từ EVN
Chạy tự động mỗi ngày lúc 8:00 AM và 8:00 PM
Usage: python evn_daily_cron.py
"""

import subprocess
import json
from datetime import datetime
import os
import sys

def log_message(message):
    """Ghi log với timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    
    # Ghi vào file log
    log_file = "evn_daily.log"
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_line + "\n")
    except Exception as e:
        print(f"Lỗi ghi log: {e}")

def run_evn_script():
    """Chạy script EVN và trả về kết quả"""
    log_message("🔌 [CRON] Bắt đầu lấy dữ liệu EVN...")
    
    try:
        # Chạy script Python
        result = subprocess.run(
            ["python", "evn_daily_simple_no_emoji.py"],
            capture_output=True,
            text=True,
            timeout=300  # Timeout 5 phút
        )
        
        if result.returncode == 0:
            log_message("✅ [CRON] Script EVN chạy thành công!")
            
            # Kiểm tra file output
            if os.path.exists("evn_daily_data.json"):
                try:
                    with open("evn_daily_data.json", "r", encoding="utf-8") as f:
                        data = json.load(f)
                    
                    status = data.get("status", "unknown")
                    region = data.get("region", "unknown")
                    customer_name = data.get("customer_info", {}).get("ten_khachhang", "unknown")
                    
                    log_message(f"📊 [CRON] Dữ liệu: {status} | {region} | {customer_name}")
                    
                    if "daily_consumption" in data and "data" in data["daily_consumption"]:
                        daily_data = data["daily_consumption"]["data"]
                        if daily_data:
                            latest = daily_data[0]
                            log_message(f"⚡ [CRON] Ngày mới nhất: {latest.get('ngay')} - {latest.get('san_luong')} kWh")
                    
                    return True
                    
                except Exception as e:
                    log_message(f"❌ [CRON] Lỗi đọc file JSON: {e}")
                    return False
            else:
                log_message("⚠️ [CRON] Không tìm thấy file evn_daily_data.json")
                return False
        else:
            log_message(f"❌ [CRON] Script EVN lỗi (exit code: {result.returncode})")
            log_message(f"📋 [CRON] STDOUT: {result.stdout}")
            log_message(f"📋 [CRON] STDERR: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        log_message("⏱️ [CRON] Script EVN timeout sau 5 phút!")
        return False
    except Exception as e:
        log_message(f"❌ [CRON] Lỗi chạy script EVN: {e}")
        return False

def create_history_backup():
    """Backup dữ liệu cũ với timestamp"""
    try:
        if os.path.exists("evn_daily_data.json"):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"evn_daily_data_{timestamp}.json"
            
            # Copy file
            with open("evn_daily_data.json", "r", encoding="utf-8") as source:
                data = source.read()
            
            with open(backup_name, "w", encoding="utf-8") as backup:
                backup.write(data)
            
            log_message(f"💾 [CRON] Đã backup dữ liệu cũ: {backup_name}")
            
            # Xóa backup cũ hơn 7 ngày
            cleanup_old_backups()
            
    except Exception as e:
        log_message(f"⚠️ [CRON] Lỗi backup: {e}")

def cleanup_old_backups():
    """Xóa backup cũ hơn 7 ngày"""
    try:
        current_time = datetime.now().timestamp()
        seven_days = 7 * 24 * 60 * 60  # 7 ngày tính bằng giây
        
        for file in os.listdir("."):
            if file.startswith("evn_daily_data_") and file.endswith(".json"):
                file_time = os.path.getmtime(file)
                if current_time - file_time > seven_days:
                    os.remove(file)
                    log_message(f"🗑️ [CRON] Đã xóa backup cũ: {file}")
                    
    except Exception as e:
        log_message(f"⚠️ [CRON] Lỗi cleanup: {e}")

def send_notification_if_needed(success):
    """Gửi thông báo nếu cần (có thể tích hợp email, webhook...)"""
    try:
        if not success:
            # Đếm số lần lỗi liên tiếp
            error_count = count_consecutive_errors()
            if error_count >= 3:
                log_message(f"🚨 [CRON] CẢNH BÁO: Đã lỗi {error_count} lần liên tiếp!")
                # TODO: Tích hợp gửi email/SMS/webhook cảnh báo
        else:
            log_message("✅ [CRON] Hoạt động bình thường")
            
    except Exception as e:
        log_message(f"⚠️ [CRON] Lỗi notification: {e}")

def count_consecutive_errors():
    """Đếm số lần lỗi liên tiếp từ log"""
    try:
        if not os.path.exists("evn_daily.log"):
            return 0
            
        error_count = 0
        with open("evn_daily.log", "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Đọc ngược từ dưới lên
        for line in reversed(lines[-50:]):  # Kiểm tra 50 dòng cuối
            if "[CRON] Script EVN chạy thành công!" in line:
                break
            elif "[CRON] Script EVN lỗi" in line or "[CRON] Script EVN timeout" in line:
                error_count += 1
        
        return error_count
        
    except Exception:
        return 0

def main():
    """Main function"""
    log_message("=" * 60)
    log_message("🤖 [CRON] EVN Daily Data Collector - Bắt đầu")
    
    # Backup dữ liệu cũ
    create_history_backup()
    
    # Chạy script lấy dữ liệu
    success = run_evn_script()
    
    # Gửi thông báo nếu cần
    send_notification_if_needed(success)
    
    # Kết thúc
    status = "THÀNH CÔNG" if success else "THẤT BẠI"
    log_message(f"🏁 [CRON] Kết thúc - Trạng thái: {status}")
    log_message("=" * 60)
    
    # Exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 