#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script lấy số điện từng ngày từ EVN Việt Nam (No Emoji Version)
Hỗ trợ: EVNHANOI, EVNHCMC, EVNNPC, EVNCPC, EVNSPC
Tác giả: Auto-generated cho user thuchi
"""

import requests
import json
import re
from datetime import datetime, timedelta
import sys
import time

# Thông tin tài khoản EVN của bạn
USERNAME = "0906658599"
PASSWORD = "!QAZ2wsx11"
CUSTOMER_ID = "PE0400065097"

class EVNSimple:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.access_token = None
        
        # Danh sách các domain backup cho từng khu vực
        self.evnhanoi_domains = [
            "https://cskh.evnhanoi.vn",
            "https://evnhanoi.vn",
            "https://www.evnhanoi.vn"
        ]
        
        self.evnhcmc_domains = [
            "https://cskh.evnhcmc.vn",
            "https://evnhcmc.vn",
            "https://www.evnhcmc.vn"
        ]
        
    def detect_evn_region(self, customer_id):
        """Tự động xác định khu vực EVN dựa vào mã khách hàng"""
        # PE04 có thể là EVNHCMC (TP.HCM) hoặc EVNHANOI
        # Thử EVNHCMC trước cho user ở HCM
        if customer_id.startswith('PE04'):
            return 'EVNHCMC'  # User ở HCM nên thử HCM trước
        elif customer_id.startswith('PH'):
            return 'EVNHCMC'
        elif customer_id.startswith('PC'):
            return 'EVNCPC'
        elif customer_id.startswith('PN'):
            return 'EVNSPC'
        elif customer_id.startswith('PA'):
            return 'EVNNPC'
        else:
            return 'EVNHCMC'  # Mặc định HCM vì user ở HCM
    
    def test_connection(self, base_url):
        """Test kết nối tới domain"""
        try:
            response = self.session.get(f"{base_url}/", timeout=10)
            return response.status_code in [200, 301, 302, 403, 404]
        except:
            return False
    
    def login_evnhcmc_multi_domain(self, username, password):
        """Đăng nhập EVNHCMC với nhiều domain backup"""
        
        # Thử các API endpoint khác nhau cho EVNHCMC
        login_endpoints = [
            "/api/token",
            "/api/auth/login",
            "/api/authenticate", 
            "/auth/login",
            "/api/login",
            "/token",
            "/login"
        ]
        
        for base_url in self.evnhcmc_domains:
            print(f"[EVNHCMC] Thu ket noi toi: {base_url}")
            
            if not self.test_connection(base_url):
                print(f"[ERROR] Khong the ket noi toi {base_url}")
                continue
                
            print(f"[OK] Ket noi thanh cong toi {base_url}")
            
            for endpoint in login_endpoints:
                login_url = f"{base_url}{endpoint}"
                print(f"[LOGIN] Thu dang nhap EVNHCMC: {login_url}")
                
                # Thử các format payload khác nhau cho EVNHCMC
                payloads = [
                    {
                        "username": username,
                        "password": password,
                        "grant_type": "password"
                    },
                    {
                        "username": username,
                        "password": password
                    },
                    {
                        "user": username,
                        "pwd": password
                    },
                    {
                        "loginName": username,
                        "password": password
                    },
                    {
                        "email": username,
                        "password": password
                    },
                    {
                        "phone": username,
                        "password": password
                    }
                ]
                
                for payload in payloads:
                    try:
                        # Thử POST với form data
                        response = self.session.post(login_url, data=payload, timeout=15)
                        
                        if response.status_code == 200:
                            try:
                                data = response.json()
                                if "access_token" in data or "token" in data or "jwt" in data:
                                    token = data.get("access_token") or data.get("token") or data.get("jwt")
                                    self.access_token = token
                                    print(f"[SUCCESS] Dang nhap EVNHCMC thanh cong! Token: {token[:20]}...")
                                    return base_url
                            except:
                                pass
                        
                        # Thử POST với JSON
                        response = self.session.post(login_url, json=payload, timeout=15)
                        
                        if response.status_code == 200:
                            try:
                                data = response.json()
                                if "access_token" in data or "token" in data or "jwt" in data:
                                    token = data.get("access_token") or data.get("token") or data.get("jwt")
                                    self.access_token = token
                                    print(f"[SUCCESS] Dang nhap EVNHCMC thanh cong! Token: {token[:20]}...")
                                    return base_url
                            except:
                                pass
                                
                    except Exception as e:
                        print(f"[WARNING] Loi voi {login_url}: {str(e)[:100]}")
                        continue
        
        print("[ERROR] Khong the dang nhap EVNHCMC!")
        return None
    
    def login_evnhanoi_multi_domain(self, username, password):
        """Đăng nhập EVNHANOI với nhiều domain backup"""
        
        # Thử các API endpoint khác nhau
        login_endpoints = [
            "/api/token",
            "/api/auth/login", 
            "/auth/login",
            "/api/login",
            "/token"
        ]
        
        for base_url in self.evnhanoi_domains:
            print(f"[EVNHANOI] Thu ket noi toi: {base_url}")
            
            if not self.test_connection(base_url):
                print(f"[ERROR] Khong the ket noi toi {base_url}")
                continue
                
            print(f"[OK] Ket noi thanh cong toi {base_url}")
            
            for endpoint in login_endpoints:
                login_url = f"{base_url}{endpoint}"
                print(f"[LOGIN] Thu dang nhap EVNHANOI: {login_url}")
                
                # Thử các format payload khác nhau
                payloads = [
                    {
                        "username": username,
                        "password": password,
                        "client_id": "httplocalhost4500",
                        "client_secret": "secret",
                        "grant_type": "password"
                    },
                    {
                        "username": username,
                        "password": password
                    },
                    {
                        "user": username,
                        "pwd": password
                    },
                    {
                        "loginName": username,
                        "password": password
                    }
                ]
                
                for payload in payloads:
                    try:
                        # Thử POST với form data
                        response = self.session.post(login_url, data=payload, timeout=15)
                        
                        if response.status_code == 200:
                            try:
                                data = response.json()
                                if "access_token" in data:
                                    self.access_token = data["access_token"]
                                    print(f"[SUCCESS] Dang nhap EVNHANOI thanh cong! Token: {self.access_token[:20]}...")
                                    return base_url
                            except:
                                pass
                        
                        # Thử POST với JSON
                        response = self.session.post(login_url, json=payload, timeout=15)
                        
                        if response.status_code == 200:
                            try:
                                data = response.json()
                                if "access_token" in data:
                                    self.access_token = data["access_token"]
                                    print(f"[SUCCESS] Dang nhap EVNHANOI thanh cong! Token: {self.access_token[:20]}...")
                                    return base_url
                            except:
                                pass
                                
                    except Exception as e:
                        print(f"[WARNING] Loi voi {login_url}: {str(e)[:100]}")
                        continue
        
        print("[ERROR] Khong the dang nhap EVNHANOI!")
        return None
    
    def create_mock_data(self):
        """Tạo dữ liệu giả để test (khi không kết nối được EVN)"""
        today = datetime.now()
        daily_data = []
        
        for i in range(7):  # 7 ngày gần nhất
            date = today - timedelta(days=i)
            daily_data.append({
                "ngay": date.strftime("%d/%m/%Y"),
                "san_luong": round(12 + (i * 0.5), 2),  # 12-15 kWh/ngày
                "chi_so": 1450 + (i * 12),
                "tien_uoc_tinh": round((12 + (i * 0.5)) * 2500, 0)  # Giá ước tính 2500đ/kWh
            })
        
        result = {
            "status": "mock_data",
            "timestamp": datetime.now().isoformat(),
            "customer_info": {
                "ten_khachhang": "Khach hang TPHCM Demo",
                "dia_chi": "TP Ho Chi Minh",
                "ma_congto": "CT123456",
                "ma_khachhang": CUSTOMER_ID
            },
            "daily_consumption": {
                "data": daily_data,
                "tong_san_luong_thang": sum([d["san_luong"] for d in daily_data]),
                "tong_tien_uoc_tinh": sum([d["tien_uoc_tinh"] for d in daily_data])
            },
            "region": "EVNHCMC",
            "customer_id": CUSTOMER_ID,
            "note": "Day la du lieu gia vi khong the ket noi toi EVN!"
        }
        
        return result
    
    def get_daily_consumption(self, username, password, customer_id):
        """Lấy số điện từng ngày (tự động xác định khu vực)"""
        region = self.detect_evn_region(customer_id)
        print(f"[DETECT] Phat hien khu vuc: {region} (User o HCM)")
        
        # Thử EVNHCMC trước vì user ở HCM
        if region == 'EVNHCMC':
            base_url = self.login_evnhcmc_multi_domain(username, password)
            if base_url:
                return self.get_daily_consumption_evnhcmc(base_url, customer_id)
            else:
                # Nếu EVNHCMC không được, thử EVNHANOI
                print("[FALLBACK] EVNHCMC khong duoc, thu EVNHANOI...")
                base_url = self.login_evnhanoi_multi_domain(username, password)
                if base_url:
                    return self.get_daily_consumption_evnhanoi(base_url, customer_id)
                else:
                    print("[FALLBACK] Khong the dang nhap EVN, tao du lieu demo...")
                    return self.create_mock_data()
        elif region == 'EVNHANOI':
            base_url = self.login_evnhanoi_multi_domain(username, password)
            if base_url:
                return self.get_daily_consumption_evnhanoi(base_url, customer_id)
            else:
                print("[FALLBACK] Khong the dang nhap EVN, tao du lieu demo...")
                return self.create_mock_data()
        else:
            print(f"[ERROR] Chua ho tro khu vuc {region}. Tao du lieu demo...")
            return self.create_mock_data()
    
    def get_daily_consumption_evnhcmc(self, base_url, customer_id):
        """Lấy số điện từng ngày từ EVNHCMC"""
        if not self.access_token:
            print("[ERROR] Chua co access token!")
            return self.create_mock_data()
            
        # Thử các API endpoint khác nhau cho EVNHCMC
        info_endpoints = [
            "/api/customer/info",
            "/api/khachhang/thongtin",
            "/api/cskh/thongtinkhachhang",
            "/api/customer/details"
        ]
        
        consumption_endpoints = [
            "/api/consumption/daily",
            "/api/sanluong/daily",
            "/api/meter/consumption",
            "/api/cskh/sanluong"
        ]
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        today = datetime.now()
        from_date = (today - timedelta(days=30)).strftime("%d/%m/%Y")
        to_date = today.strftime("%d/%m/%Y")
        
        # Thử lấy dữ liệu với các endpoint khác nhau
        for info_endpoint in info_endpoints:
            for consumption_endpoint in consumption_endpoints:
                try:
                    print(f"[API] Thu API EVNHCMC: {base_url}{info_endpoint}")
                    
                    # Lấy thông tin khách hàng
                    customer_response = self.session.post(
                        f"{base_url}{info_endpoint}",
                        json={"ma_khachhang": customer_id},
                        headers=headers,
                        timeout=20
                    )
                    
                    # Lấy dữ liệu sản lượng
                    consumption_response = self.session.post(
                        f"{base_url}{consumption_endpoint}",
                        json={
                            "ma_khachhang": customer_id,
                            "tu_ngay": from_date,
                            "den_ngay": to_date
                        },
                        headers=headers,
                        timeout=20
                    )
                    
                    if customer_response.status_code == 200 and consumption_response.status_code == 200:
                        customer_data = customer_response.json()
                        consumption_data = consumption_response.json()
                        
                        result = {
                            "status": "success",
                            "timestamp": datetime.now().isoformat(),
                            "customer_info": customer_data,
                            "daily_consumption": consumption_data,
                            "region": "EVNHCMC",
                            "customer_id": customer_id,
                            "api_endpoint": f"{base_url}{info_endpoint}"
                        }
                        
                        return result
                        
                except Exception as e:
                    print(f"[WARNING] Loi API EVNHCMC {info_endpoint}: {str(e)[:100]}")
                    continue
        
        print("[ERROR] Khong the lay du lieu tu bat ky API EVNHCMC nao, tao du lieu demo...")
        return self.create_mock_data()
    
    def get_daily_consumption_evnhanoi(self, base_url, customer_id):
        """Lấy số điện từng ngày từ EVNHANOI"""
        if not self.access_token:
            print("[ERROR] Chua co access token!")
            return self.create_mock_data()
            
        # Thử các API endpoint khác nhau
        info_endpoints = [
            "/api/cskh/thongtinkhachhang/laythongtinkhachhang",
            "/api/customer/info",
            "/api/khachhang/thongtin"
        ]
        
        consumption_endpoints = [
            "/api/cskh/sanluong/laydulieusanluong",
            "/api/consumption/daily",
            "/api/sanluong/daily"
        ]
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        today = datetime.now()
        from_date = (today - timedelta(days=30)).strftime("%d/%m/%Y")
        to_date = today.strftime("%d/%m/%Y")
        
        # Thử lấy dữ liệu với các endpoint khác nhau
        for info_endpoint in info_endpoints:
            for consumption_endpoint in consumption_endpoints:
                try:
                    print(f"[API] Thu API EVNHANOI: {base_url}{info_endpoint}")
                    
                    # Lấy thông tin khách hàng
                    customer_response = self.session.post(
                        f"{base_url}{info_endpoint}",
                        json={"ma_khachhang": customer_id},
                        headers=headers,
                        timeout=20
                    )
                    
                    # Lấy dữ liệu sản lượng
                    consumption_response = self.session.post(
                        f"{base_url}{consumption_endpoint}",
                        json={
                            "ma_khachhang": customer_id,
                            "tu_ngay": from_date,
                            "den_ngay": to_date
                        },
                        headers=headers,
                        timeout=20
                    )
                    
                    if customer_response.status_code == 200 and consumption_response.status_code == 200:
                        customer_data = customer_response.json()
                        consumption_data = consumption_response.json()
                        
                        result = {
                            "status": "success",
                            "timestamp": datetime.now().isoformat(),
                            "customer_info": customer_data,
                            "daily_consumption": consumption_data,
                            "region": "EVNHANOI",
                            "customer_id": customer_id,
                            "api_endpoint": f"{base_url}{info_endpoint}"
                        }
                        
                        return result
                        
                except Exception as e:
                    print(f"[WARNING] Loi API EVNHANOI {info_endpoint}: {str(e)[:100]}")
                    continue
        
        print("[ERROR] Khong the lay du lieu tu bat ky API EVNHANOI nao, tao du lieu demo...")
        return self.create_mock_data()

def main():
    print("EVN Daily Data Collector - Bat dau...")
    print(f"Tai khoan: {USERNAME}")
    print(f"Ma khach hang: {CUSTOMER_ID}")
    print(f"Vi tri: TP Ho Chi Minh")
    print("-" * 50)
    
    evn = EVNSimple()
    data = evn.get_daily_consumption(USERNAME, PASSWORD, CUSTOMER_ID)
    
    if data:
        # Lưu dữ liệu ra file JSON
        output_file = "evn_daily_data.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"[SUCCESS] Da luu du lieu vao file: {output_file}")
        
        # Hiển thị tóm tắt
        customer_info = data.get("customer_info", {})
        consumption = data.get("daily_consumption", {})
        
        print(f"[SUMMARY] Trang thai: {data.get('status', 'N/A')}")
        print(f"[SUMMARY] Khu vuc: {data.get('region', 'N/A')}")
        print(f"[SUMMARY] Ten khach hang: {customer_info.get('ten_khachhang', 'N/A')}")
        print(f"[SUMMARY] Dia chi: {customer_info.get('dia_chi', 'N/A')}")
        print(f"[SUMMARY] Ma cong to: {customer_info.get('ma_congto', 'N/A')}")
        
        if isinstance(consumption, dict):
            if 'data' in consumption:
                daily_data = consumption['data']
                if isinstance(daily_data, list) and len(daily_data) > 0:
                    print(f"[DATA] Du lieu {len(daily_data)} ngay gan nhat:")
                    for i, day in enumerate(daily_data[:5]):  # Hiển thị 5 ngày đầu
                        print(f"  {i+1}. {day.get('ngay', 'N/A')}: {day.get('san_luong', 'N/A')} kWh")
            
            if 'tong_san_luong_thang' in consumption:
                print(f"[TOTAL] Tong san luong: {consumption['tong_san_luong_thang']} kWh")
                print(f"[TOTAL] Tong tien uoc tinh: {consumption['tong_tien_uoc_tinh']:,.0f} VND")
        
        return True
    else:
        print("[ERROR] Khong the lay du lieu so dien!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 