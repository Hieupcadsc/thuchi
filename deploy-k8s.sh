#!/bin/bash

# Deploy script for Thuchi app to Kubernetes
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="thuchi-app"
APP_NAME="thuchi-app"
IMAGE_TAG=${1:-"latest"}

# Functions
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

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl không được tìm thấy. Vui lòng cài đặt kubectl."
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Không thể kết nối đến Kubernetes cluster. Vui lòng kiểm tra kubeconfig."
        exit 1
    fi
    
    log_success "kubectl đã sẵn sàng"
}

# Check if Docker image exists
check_image() {
    local image="ghcr.io/$(git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/\.git$//')"
    log_info "Kiểm tra Docker image: $image:$IMAGE_TAG"
    
    # Note: This would require authentication to GitHub Container Registry
    log_warning "Đảm bảo image $image:$IMAGE_TAG đã được build và push lên registry"
}

# Apply Kubernetes manifests
apply_manifests() {
    log_info "Applying Kubernetes manifests..."
    
    # Apply in order
    kubectl apply -f k8s/namespace.yaml
    log_success "Applied namespace"
    
    kubectl apply -f k8s/persistentvolume.yaml
    log_success "Applied PVC and ConfigMap"
    
    kubectl apply -f k8s/service.yaml
    log_success "Applied service"
    
    # Update deployment with correct image
    local repo_name=$(git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/\.git$//')
    local image="ghcr.io/$repo_name:$IMAGE_TAG"
    
    # Create temporary deployment file with correct image
    sed "s|ghcr.io/OWNER/REPO:latest|$image|g" k8s/deployment.yaml > /tmp/deployment-temp.yaml
    kubectl apply -f /tmp/deployment-temp.yaml
    rm /tmp/deployment-temp.yaml
    
    log_success "Applied deployment with image: $image"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    kubectl -n $NAMESPACE rollout status deployment/$APP_NAME --timeout=300s
    log_success "Deployment is ready"
}

# Show deployment status
show_status() {
    log_info "Deployment status:"
    kubectl -n $NAMESPACE get pods,svc -o wide
    
    # Get application URL
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "localhost")
    NODE_PORT=$(kubectl -n $NAMESPACE get svc ${APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30080")
    
    echo ""
    log_success "Application is available at: http://$NODE_IP:$NODE_PORT"
}

# Cleanup function
cleanup() {
    log_warning "Cleaning up resources..."
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    log_success "Cleanup completed"
}

# Main execution
main() {
    echo "=== Thuchi Kubernetes Deployment Script ==="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_kubectl
            check_image
            apply_manifests
            wait_for_deployment
            show_status
            ;;
        "status")
            check_kubectl
            show_status
            ;;
        "cleanup")
            check_kubectl
            cleanup
            ;;
        "restart")
            check_kubectl
            kubectl -n $NAMESPACE rollout restart deployment/$APP_NAME
            wait_for_deployment
            show_status
            ;;
        *)
            echo "Usage: $0 [deploy|status|cleanup|restart] [image_tag]"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy application to Kubernetes (default)"
            echo "  status   - Show current deployment status"
            echo "  cleanup  - Remove all resources"
            echo "  restart  - Restart the deployment"
            echo ""
            echo "Parameters:"
            echo "  image_tag - Docker image tag to deploy (default: latest)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
