#!/bin/bash
# ==========================================
# 🔧 Common Functions for Delqhi-Platform Services
# Shared by all zimmer-XX scripts
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Check if container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Check if container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Check if image exists
image_exists() {
    docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}$" || \
    docker images --format '{{.Repository}}' | grep -q "^${IMAGE_NAME%%:*}$"
}

# Ensure network exists
ensure_network() {
    if ! docker network ls --format '{{.Name}}' | grep -q "^haus-netzwerk$"; then
        log_info "Creating network: haus-netzwerk"
        docker network create --driver bridge --subnet 172.20.0.0/16 haus-netzwerk
        log_success "Network created"
    fi
}

# Build image
build_image() {
    local context="$1"
    log_info "Building image: $IMAGE_NAME"
    cd "$PROJECT_ROOT"
    docker build -t "$IMAGE_NAME" "$context"
    log_success "Image built: $IMAGE_NAME"
}

# Start container
start_container() {
    ensure_network
    
    if container_running; then
        log_warn "$CONTAINER_NAME is already running"
        return 0
    fi
    
    if container_exists; then
        log_info "Starting existing container: $CONTAINER_NAME"
        docker start "$CONTAINER_NAME"
    else
        if ! image_exists; then
            log_error "Image not found: $IMAGE_NAME"
            log_info "Run: $0 build"
            exit 1
        fi
        log_info "Creating and starting: $CONTAINER_NAME"
        run_service
    fi
    
    log_success "$CONTAINER_NAME started"
    echo -e "${CYAN}Port:${NC} $PORT_EXTERNAL → $PORT_INTERNAL"
}

# Stop container
stop_container() {
    if container_running; then
        log_info "Stopping: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME"
        log_success "$CONTAINER_NAME stopped"
    else
        log_warn "$CONTAINER_NAME is not running"
    fi
}

# Restart container
restart_container() {
    stop_container
    sleep 2
    
    if container_exists; then
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
    
    start_container
}

# Show status
show_status() {
    echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  $SERVICE_NAME${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}\n"
    
    if container_running; then
        echo -e "Status: ${GREEN}● RUNNING${NC}"
        
        # Get container info
        local info=$(docker inspect "$CONTAINER_NAME" 2>/dev/null)
        local ip=$(echo "$info" | jq -r '.[0].NetworkSettings.Networks["haus-netzwerk"].IPAddress // "N/A"')
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
        local uptime=$(docker inspect --format='{{.State.StartedAt}}' "$CONTAINER_NAME" 2>/dev/null)
        
        echo -e "Container: ${YELLOW}$CONTAINER_NAME${NC}"
        echo -e "IP: ${YELLOW}$ip${NC}"
        echo -e "Port: ${YELLOW}$PORT_EXTERNAL → $PORT_INTERNAL${NC}"
        echo -e "Health: ${YELLOW}$health${NC}"
        echo -e "Started: ${YELLOW}$uptime${NC}"
        
        # Quick health check
        echo -e "\n${BLUE}Health Check:${NC}"
        if curl -sf "http://localhost:$PORT_EXTERNAL/health" > /dev/null 2>&1; then
            echo -e "  HTTP: ${GREEN}● OK${NC}"
        else
            echo -e "  HTTP: ${RED}● FAILED${NC}"
        fi
    elif container_exists; then
        echo -e "Status: ${YELLOW}● STOPPED${NC}"
    else
        echo -e "Status: ${RED}● NOT CREATED${NC}"
    fi
    
    echo ""
}

# Show logs
show_logs() {
    local lines="${1:-100}"
    if container_exists; then
        docker logs --tail "$lines" -f "$CONTAINER_NAME"
    else
        log_error "Container not found: $CONTAINER_NAME"
        exit 1
    fi
}

# Show help
show_help() {
    echo -e "\n${CYAN}$SERVICE_NAME${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start     Start the container"
    echo "  stop      Stop the container"
    echo "  restart   Restart (recreate) the container"
    echo "  status    Show container status"
    echo "  logs [n]  Show last n logs (default: 100)"
    echo "  build     Build the Docker image"
    echo "  shell     Open shell in container"
    echo ""
}
