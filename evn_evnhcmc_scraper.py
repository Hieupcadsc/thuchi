#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EVNHCMC Web Scraper - Lấy dữ liệu điện thật từ https://cskh.evnhcmc.vn
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import json
from datetime import datetime
from selenium.webdriver.chrome.service import Service

USERNAME = "0906658599"
PASSWORD = "!QAZ2wsx11"
CUSTOMER_CODE = "PE0400065097"

# Đường dẫn trang lịch sử sử dụng điện
HISTORY_URL = "https://cskh.evnhcmc.vn/lich-su-su-dung-dien"


def scrape_evnhcmc():
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--disable-gpu')
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    wait = WebDriverWait(driver, 20)
    try:
        print("[INFO] Đang mở trang EVNHCMC...")
        driver.get("https://cskh.evnhcmc.vn")
        time.sleep(2)
        # Nhấn nút Đăng nhập
        login_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href,'/Account/Login')]")))
        login_btn.click()
        # Nhập tài khoản
        user_input = wait.until(EC.presence_of_element_located((By.ID, "UserName")))
        user_input.clear()
        user_input.send_keys(USERNAME)
        # Nhập mật khẩu
        pass_input = driver.find_element(By.ID, "Password")
        pass_input.clear()
        pass_input.send_keys(PASSWORD)
        # Submit
        pass_input.send_keys(Keys.RETURN)
        print("[INFO] Đăng nhập...")
        # Đợi login thành công (có tên khách hàng)
        wait.until(EC.presence_of_element_located((By.XPATH, "//span[contains(@class,'user-name')]")))
        print("[OK] Đăng nhập thành công!")
        # Truy cập trang lịch sử sử dụng điện
        driver.get(HISTORY_URL)
        time.sleep(5)  # Đợi trang load đủ
        html = driver.page_source
        with open('evn_debug.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("[DEBUG] Đã lưu file evn_debug.html để kiểm tra selector!")
        # (Dừng script tại đây để chỉ lấy HTML)
        return
        # Lấy thông tin khách hàng
        kh_info = soup.find('div', class_='customer-info')
        name = kh_info.find('div', class_='customer-name').text.strip() if kh_info else ''
        address = kh_info.find('div', class_='customer-address').text.strip() if kh_info else ''
        # Lấy mã KH
        ma_kh = soup.find('div', class_='customer-code').text.strip() if soup.find('div', class_='customer-code') else CUSTOMER_CODE
        # Lấy tổng sản lượng
        tong_kwh = 0.0
        tong_kwh_tag = soup.find('div', class_='total-index')
        if tong_kwh_tag:
            try:
                tong_kwh = float(tong_kwh_tag.text.replace('kWh','').replace(',','').strip())
            except:
                tong_kwh = 0.0
        # Lấy dữ liệu từng ngày
        daily_data = []
        chart = soup.find('div', class_='chart-container')
        if chart:
            bars = chart.find_all('div', class_='highcharts-point')
            # Tuy nhiên, dữ liệu thực tế nằm trong JS, nên lấy từ bảng dưới nếu có
            table = soup.find('table')
            if table:
                rows = table.find_all('tr')[1:]
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        date = cols[0].text.strip()
                        try:
                            kwh = float(cols[1].text.strip().replace(',',''))
                        except:
                            kwh = 0.0
                        daily_data.append({
                            "date": date,
                            "consumption_kwh": kwh,
                            "amount_vnd": int(kwh * 2750)
                        })
        # Nếu không có bảng, lấy từ chart (dự phòng)
        if not daily_data and chart:
            # Không chắc chắn, nên bỏ qua nếu không có bảng
            pass
        # Tính tổng lại nếu cần
        if not tong_kwh and daily_data:
            tong_kwh = sum(d["consumption_kwh"] for d in daily_data)
        # Format output
        data = {
            "status": "real_data_success",
            "region": "EVNHCMC",
            "customer_info": {
                "name": name,
                "customer_code": ma_kh,
                "address": address,
                "meter_code": ma_kh,
            },
            "summary": {
                "total_consumption_kwh": round(tong_kwh, 2),
                "total_amount_vnd": int(tong_kwh * 2750),
                "average_daily_kwh": round(tong_kwh / len(daily_data), 2) if daily_data else 0,
                "days_count": len(daily_data),
                "billing_period": ""
            },
            "daily_data": daily_data,
            "last_updated": datetime.now().strftime("%H:%M:%S %d/%m/%Y"),
            "data_quality": "authentic",
            "notes": "Dữ liệu lấy tự động từ EVNHCMC"
        }
        with open('evn_daily_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("[OK] Đã lưu dữ liệu vào evn_daily_data.json!")
    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_evnhcmc() 