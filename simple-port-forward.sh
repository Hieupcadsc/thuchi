#!/bin/bash

# Script đơn giản để port forward - chọn IP và port
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# File lưu cấu hình
CONFIG_DIR="/tmp/port-forward"
PID_DIR="/tmp/port-forward-pids"

# Tạo thư mục nếu chưa có
mkdir -p $CONFIG_DIR
mkdir -p $PID_DIR

# Functions
setup_port_forward() {
    echo "=== Cấu hình Port Forward ==="
    echo ""
    
    # Chọn tên app
    read -p "Nhập tên app (ví dụ: thuchi, app2, api): " APP_NAME
    
    if [ -z "$APP_NAME" ]; then
        log_error "Tên app không được để trống!"
        return 1
    fi
    
    # Chọn IP nguồn (IP thật của máy)
    echo "IP nguồn (IP thật của máy Linux):"
    echo "1. 192.168.100.170"
    echo "2. Nhập IP khác"
    read -p "Chọn (1-2): " ip_choice
    
    case $ip_choice in
        1)
            SOURCE_IP="192.168.100.170"
            ;;
        2)
            read -p "Nhập IP nguồn: " SOURCE_IP
            ;;
        *)
            SOURCE_IP="192.168.100.170"
            ;;
    esac
    
    # Chọn IP đích (minikube)
    echo ""
    echo "IP đích (minikube):"
    echo "1. 192.168.49.2 (mặc định)"
    echo "2. Nhập IP khác"
    read -p "Chọn (1-2): " dest_choice
    
    case $dest_choice in
        1)
            DEST_IP="192.168.49.2"
            ;;
        2)
            read -p "Nhập IP đích: " DEST_IP
            ;;
        *)
            DEST_IP="192.168.49.2"
            ;;
    esac
    
    # Chọn port
    echo ""
    echo "Port để forward:"
    echo "1. 30080 (thuchi app)"
    echo "2. 30081 (app2)"
    echo "3. 30082 (app3)"
    echo "4. Nhập port khác"
    read -p "Chọn (1-4): " port_choice
    
    case $port_choice in
        1)
            PORT="30080"
            ;;
        2)
            PORT="30081"
            ;;
        3)
            PORT="30082"
            ;;
        4)
            read -p "Nhập port: " PORT
            ;;
        *)
            PORT="30080"
            ;;
    esac
    
    # Lưu cấu hình
    CONFIG_FILE="$CONFIG_DIR/$APP_NAME.conf"
    echo "APP_NAME=$APP_NAME" > $CONFIG_FILE
    echo "SOURCE_IP=$SOURCE_IP" >> $CONFIG_FILE
    echo "DEST_IP=$DEST_IP" >> $CONFIG_FILE
    echo "PORT=$PORT" >> $CONFIG_FILE
    
    log_success "Cấu hình đã lưu cho app: $APP_NAME"
    echo "App: $APP_NAME"
    echo "IP nguồn: $SOURCE_IP"
    echo "IP đích: $DEST_IP"
    echo "Port: $PORT"
    echo "URL: http://$SOURCE_IP:$PORT"
}

start_forward() {
    # Chọn app để start
    if [ -n "$2" ]; then
        APP_NAME=$2
    else
        echo "Apps đã cấu hình:"
        for config in $CONFIG_DIR/*.conf; do
            if [ -f "$config" ]; then
                source $config
                echo "  $APP_NAME (Port: $PORT)"
            fi
        done
        echo ""
        read -p "Nhập tên app để start: " APP_NAME
    fi
    
    CONFIG_FILE="$CONFIG_DIR/$APP_NAME.conf"
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Không tìm thấy cấu hình cho app: $APP_NAME"
        exit 1
    fi
    
    source $CONFIG_FILE
    
    log_info "Starting port forward..."
    log_info "$SOURCE_IP:$PORT -> $DEST_IP:$PORT"
    
    # Kill process cũ nếu có
    PID_FILE="$PID_DIR/$APP_NAME.pid"
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 $old_pid 2>/dev/null; then
            kill -9 $old_pid
            log_info "Killed old process $old_pid"
        fi
    fi
    
    # Start port forward
    socat TCP-LISTEN:$PORT,fork TCP:$DEST_IP:$PORT &
    local new_pid=$!
    echo $new_pid > "$PID_FILE"
    
    log_success "Port forward started cho $APP_NAME với PID: $new_pid"
    echo ""
    log_info "Để truy cập app:"
    echo "http://$SOURCE_IP:$PORT"
}

stop_forward() {
    # Chọn app để stop
    if [ -n "$2" ]; then
        APP_NAME=$2
    else
        echo "Apps đang chạy:"
        for pid_file in $PID_DIR/*.pid; do
            if [ -f "$pid_file" ]; then
                local app_name=$(basename $pid_file .pid)
                local pid=$(cat $pid_file)
                if kill -0 $pid 2>/dev/null; then
                    echo "  $app_name (PID: $pid)"
                fi
            fi
        done
        echo ""
        read -p "Nhập tên app để stop: " APP_NAME
    fi
    
    PID_FILE="$PID_DIR/$APP_NAME.pid"
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid
            rm "$PID_FILE"
            log_success "Port forward stopped cho $APP_NAME"
        else
            log_warning "Process $pid không tồn tại"
            rm "$PID_FILE"
        fi
    else
        log_warning "Không tìm thấy PID file cho $APP_NAME"
    fi
}

status() {
    echo "=== Status Port Forward ==="
    echo ""
    
    # Hiển thị tất cả apps
    for config in $CONFIG_DIR/*.conf; do
        if [ -f "$config" ]; then
            source $config
            PID_FILE="$PID_DIR/$APP_NAME.pid"
            
            echo "App: $APP_NAME"
            echo "  IP nguồn: $SOURCE_IP"
            echo "  IP đích: $DEST_IP"
            echo "  Port: $PORT"
            echo "  URL: http://$SOURCE_IP:$PORT"
            
            if [ -f "$PID_FILE" ]; then
                local pid=$(cat "$PID_FILE")
                if kill -0 $pid 2>/dev/null; then
                    echo -e "  Status: ${GREEN}✅ Đang chạy (PID: $pid)${NC}"
                else
                    echo -e "  Status: ${RED}❌ Không chạy${NC}"
                fi
            else
                echo -e "  Status: ${YELLOW}⚠️  Chưa start${NC}"
            fi
            echo ""
        fi
    done
    
    if [ ! "$(ls -A $CONFIG_DIR)" ]; then
        echo "Chưa có app nào được cấu hình"
    fi
}

test_connection() {
    # Chọn app để test
    if [ -n "$2" ]; then
        APP_NAME=$2
    else
        echo "Apps đã cấu hình:"
        for config in $CONFIG_DIR/*.conf; do
            if [ -f "$config" ]; then
                source $config
                echo "  $APP_NAME (Port: $PORT)"
            fi
        done
        echo ""
        read -p "Nhập tên app để test: " APP_NAME
    fi
    
    CONFIG_FILE="$CONFIG_DIR/$APP_NAME.conf"
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Không tìm thấy cấu hình cho app: $APP_NAME"
        return
    fi
    
    source $CONFIG_FILE
    
    log_info "Testing connection..."
    
    # Test local
    if curl -s http://localhost:$PORT > /dev/null; then
        log_success "Localhost:$PORT - OK"
    else
        log_error "Localhost:$PORT - FAILED"
    fi
    
    # Test IP
    if curl -s http://$SOURCE_IP:$PORT > /dev/null; then
        log_success "$SOURCE_IP:$PORT - OK"
    else
        log_error "$SOURCE_IP:$PORT - FAILED"
    fi
}

start_all_apps() {
    log_info "Starting tất cả apps..."
    for config in $CONFIG_DIR/*.conf; do
        if [ -f "$config" ]; then
            source $config
            start_forward $APP_NAME
        fi
    done
    log_success "Tất cả apps đã được start"
}

stop_all_apps() {
    log_info "Stopping tất cả apps..."
    for pid_file in $PID_DIR/*.pid; do
        if [ -f "$pid_file" ]; then
            local app_name=$(basename $pid_file .pid)
            local pid=$(cat $pid_file)
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid
                rm "$pid_file"
                log_success "Stopped $app_name"
            fi
        fi
    done
    log_success "Tất cả apps đã được stop"
}

# Main menu
show_menu() {
    echo ""
    echo "=== PORT FORWARD MANAGER ==="
    echo "1. Setup cấu hình (thêm app mới)"
    echo "2. Start port forward"
    echo "3. Stop port forward"
    echo "4. Status (xem tất cả apps)"
    echo "5. Test connection"
    echo "6. Start tất cả apps"
    echo "7. Stop tất cả apps"
    echo "8. Exit"
    echo ""
}

# Main execution
case "${1:-menu}" in
    "setup")
        setup_port_forward
        ;;
    "start")
        start_forward
        ;;
    "stop")
        stop_forward
        ;;
    "status")
        status
        ;;
    "test")
        test_connection
        ;;
    "menu")
        while true; do
            show_menu
            read -p "Chọn (1-8): " choice
            
                            case $choice in
                    1)
                        setup_port_forward
                        ;;
                    2)
                        start_forward
                        ;;
                    3)
                        stop_forward
                        ;;
                    4)
                        status
                        ;;
                    5)
                        test_connection
                        ;;
                    6)
                        start_all_apps
                        ;;
                    7)
                        stop_all_apps
                        ;;
                    8)
                        echo "Tạm biệt!"
                        exit 0
                        ;;
                    *)
                        echo "Lựa chọn không hợp lệ!"
                        ;;
                esac
            
            echo ""
            read -p "Nhấn Enter để tiếp tục..."
        done
        ;;
    *)
        echo "Usage: $0 [setup|start|stop|status|test|menu]"
        echo ""
        echo "Commands:"
        echo "  setup  - Cấu hình IP và port"
        echo "  start  - Start port forward"
        echo "  stop   - Stop port forward"
        echo "  status - Xem status"
        echo "  test   - Test connection"
        echo "  menu   - Menu tương tác (mặc định)"
        exit 1
        ;;
esac
