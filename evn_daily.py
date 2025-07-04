import asyncio
import sys
import nestup_evn.custom_components.nestup_evn.nestup_evn as nestup
import json

# Thông tin tài khoản EVN của bạn
username = "0906658599"
password = "!QAZ2wsx11"
customer_id = "PE0400065097"
region = "EVNHANOI"  # Nếu không đúng, đổi thành EVNHCMC, EVNNPC, EVNCPC, EVNSPC

def get_evn_area(customer_id):
    # Hàm này lấy thông tin khu vực EVN dựa vào mã khách hàng
    return nestup.get_evn_info(customer_id)

async def main():
    # Tạo giả HomeAssistant instance (bắt buộc vì code gốc viết cho HA)
    class DummyHass:
        def __init__(self):
            pass
        async def async_add_executor_job(self, func, *args, **kwargs):
            return func(*args, **kwargs)
    hass = DummyHass()

    evn_area = get_evn_area(customer_id)
    api = nestup.EVNAPI(hass)
    # Đăng nhập
    login_status = await api.login(evn_area, username, password, customer_id)
    if login_status != nestup.CONF_SUCCESS:
        print("Đăng nhập EVN thất bại:", login_status)
        sys.exit(1)

    # Lấy dữ liệu điện từng ngày
    data = await api.request_update(evn_area, username, password, customer_id)
    # Lưu ra file JSON
    with open("evn_daily.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Đã lưu dữ liệu số điện từng ngày ra file evn_daily.json")

if __name__ == "__main__":
    asyncio.run(main()) 