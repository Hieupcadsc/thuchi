# Makefile for Thuchi Kubernetes Deployment

# Variables
NAMESPACE := thuchi-app
APP_NAME := thuchi-app
IMAGE_TAG ?= latest
REPO_NAME := $(shell git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/\.git$$//')
IMAGE := ghcr.io/$(REPO_NAME):$(IMAGE_TAG)

# Default target
.DEFAULT_GOAL := help

# Colors
YELLOW := \033[1;33m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

.PHONY: help
help: ## Hiển thị menu help
	@echo "$(YELLOW)Thuchi Kubernetes Deployment$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: check
check: ## Kiểm tra môi trường (kubectl, docker, etc.)
	@echo "$(YELLOW)Checking environment...$(NC)"
	@command -v kubectl >/dev/null 2>&1 || { echo "$(RED)kubectl is required but not installed$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)docker is required but not installed$(NC)"; exit 1; }
	@kubectl cluster-info >/dev/null 2>&1 || { echo "$(RED)Cannot connect to Kubernetes cluster$(NC)"; exit 1; }
	@echo "$(GREEN)Environment check passed$(NC)"

.PHONY: build
build: check ## Build Docker image locally
	@echo "$(YELLOW)Building Docker image...$(NC)"
	docker build -t $(IMAGE) .
	@echo "$(GREEN)Image built: $(IMAGE)$(NC)"

.PHONY: push
push: build ## Build và push Docker image
	@echo "$(YELLOW)Pushing Docker image...$(NC)"
	docker push $(IMAGE)
	@echo "$(GREEN)Image pushed: $(IMAGE)$(NC)"

.PHONY: deploy
deploy: check ## Deploy ứng dụng lên Kubernetes
	@echo "$(YELLOW)Deploying to Kubernetes...$(NC)"
	@chmod +x deploy-k8s.sh
	./deploy-k8s.sh deploy $(IMAGE_TAG)

.PHONY: status
status: check ## Kiểm tra trạng thái deployment
	@echo "$(YELLOW)Checking deployment status...$(NC)"
	@chmod +x deploy-k8s.sh
	./deploy-k8s.sh status

.PHONY: logs
logs: check ## Xem logs của ứng dụng
	@echo "$(YELLOW)Showing application logs...$(NC)"
	kubectl -n $(NAMESPACE) logs -f deployment/$(APP_NAME) --tail=100

.PHONY: restart
restart: check ## Restart deployment
	@echo "$(YELLOW)Restarting deployment...$(NC)"
	@chmod +x deploy-k8s.sh
	./deploy-k8s.sh restart

.PHONY: scale
scale: check ## Scale deployment (sử dụng: make scale REPLICAS=3)
	@echo "$(YELLOW)Scaling deployment to $(REPLICAS) replicas...$(NC)"
	kubectl -n $(NAMESPACE) scale deployment $(APP_NAME) --replicas=$(REPLICAS)
	kubectl -n $(NAMESPACE) rollout status deployment/$(APP_NAME)

.PHONY: port-forward
port-forward: check ## Port forward để test local (port 8080)
	@echo "$(YELLOW)Port forwarding to localhost:8080...$(NC)"
	@echo "$(GREEN)Access application at: http://localhost:8080$(NC)"
	kubectl -n $(NAMESPACE) port-forward svc/$(APP_NAME)-service 8080:80

.PHONY: shell
shell: check ## Truy cập shell của pod đầu tiên
	@echo "$(YELLOW)Accessing pod shell...$(NC)"
	kubectl -n $(NAMESPACE) exec -it $$(kubectl -n $(NAMESPACE) get pods -l app=$(APP_NAME) -o jsonpath='{.items[0].metadata.name}') -- /bin/sh

.PHONY: events
events: check ## Xem Kubernetes events
	@echo "$(YELLOW)Showing Kubernetes events...$(NC)"
	kubectl -n $(NAMESPACE) get events --sort-by='.metadata.creationTimestamp'

.PHONY: describe
describe: check ## Describe deployment
	@echo "$(YELLOW)Describing deployment...$(NC)"
	kubectl -n $(NAMESPACE) describe deployment $(APP_NAME)

.PHONY: rollback
rollback: check ## Rollback deployment về version trước
	@echo "$(YELLOW)Rolling back deployment...$(NC)"
	kubectl -n $(NAMESPACE) rollout undo deployment/$(APP_NAME)
	kubectl -n $(NAMESPACE) rollout status deployment/$(APP_NAME)

.PHONY: history
history: check ## Xem deployment history
	@echo "$(YELLOW)Showing rollout history...$(NC)"
	kubectl -n $(NAMESPACE) rollout history deployment/$(APP_NAME)

.PHONY: dev
dev: ## Chạy development server
	@echo "$(YELLOW)Starting development server...$(NC)"
	npm run dev

.PHONY: test
test: ## Chạy tests
	@echo "$(YELLOW)Running tests...$(NC)"
	npm run typecheck
	npm run lint

.PHONY: clean
clean: check ## Xóa toàn bộ deployment
	@echo "$(YELLOW)Cleaning up deployment...$(NC)"
	@read -p "Are you sure you want to delete everything? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		chmod +x deploy-k8s.sh && ./deploy-k8s.sh cleanup; \
	else \
		echo "$(GREEN)Cleanup cancelled$(NC)"; \
	fi

.PHONY: update-config
update-config: check ## Cập nhật ConfigMap và restart pods
	@echo "$(YELLOW)Updating ConfigMap...$(NC)"
	kubectl apply -f k8s/persistentvolume.yaml
	kubectl -n $(NAMESPACE) rollout restart deployment/$(APP_NAME)
	kubectl -n $(NAMESPACE) rollout status deployment/$(APP_NAME)

.PHONY: backup-db
backup-db: check ## Backup SQLite database
	@echo "$(YELLOW)Backing up database...$(NC)"
	@mkdir -p backups
	@POD_NAME=$$(kubectl -n $(NAMESPACE) get pods -l app=$(APP_NAME) -o jsonpath='{.items[0].metadata.name}'); \
	kubectl -n $(NAMESPACE) exec $$POD_NAME -- tar czf - /app/data/ | tar xzf - -C backups/
	@echo "$(GREEN)Database backed up to backups/app/data/$(NC)"

.PHONY: restore-db
restore-db: check ## Restore SQLite database từ backup
	@echo "$(YELLOW)Restoring database...$(NC)"
	@if [ ! -d "backups/app/data" ]; then echo "$(RED)No backup found in backups/app/data$(NC)"; exit 1; fi
	@POD_NAME=$$(kubectl -n $(NAMESPACE) get pods -l app=$(APP_NAME) -o jsonpath='{.items[0].metadata.name}'); \
	tar czf - -C backups app/data/ | kubectl -n $(NAMESPACE) exec -i $$POD_NAME -- tar xzf - -C /
	@echo "$(GREEN)Database restored$(NC)"

# Development helpers
.PHONY: install
install: ## Install npm dependencies
	npm install

.PHONY: build-local
build-local: ## Build Next.js app locally
	npm run build

.PHONY: start-local
start-local: ## Start production build locally
	npm start
