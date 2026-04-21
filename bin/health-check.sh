#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVICES=(
    "Redis|172.20.0.10|6379|redis"
    "Postgres|172.20.0.11|5432|postgres"
    "Steel Browser|172.20.0.20|3000|http"
    "N8N|172.20.0.10|5678|http"
    "API Coordinator|172.20.0.31|8000|http"
    "Dashboard|172.20.0.60|3000|http"
    "Survey Worker|172.20.0.80|8018|http"
    "Captcha Worker|172.20.0.81|8019|http"
    "SurfSense|172.20.0.60|3003|http"
    "Supabase Studio|172.20.0.70|3000|http"
)

check_http() {
    local ip=$1
    local port=$2
    curl -sf --connect-timeout 2 "http://${ip}:${port}/health" > /dev/null 2>&1 || \
    curl -sf --connect-timeout 2 "http://${ip}:${port}/" > /dev/null 2>&1
}

check_redis() {
    local ip=$1
    local port=$2
    docker exec Zimmer-Speicher-Redis redis-cli ping > /dev/null 2>&1
}

check_postgres() {
    local ip=$1
    local port=$2
    docker exec Zimmer-Archiv-Postgres pg_isready -h localhost > /dev/null 2>&1
}

run_health_check() {
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     🏥 SIN-SOLVER HEALTH CHECK                            ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "%-25s %-20s %-10s %-10s\n" "SERVICE" "IP:PORT" "STATUS" "LATENCY"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local total=0
    local healthy=0
    
    for service in "${SERVICES[@]}"; do
        IFS='|' read -r name ip port type <<< "$service"
        total=$((total + 1))
        
        local start_time=$(python3 -c "import time; print(int(time.time()*1000))")
        local status=""
        
        case "$type" in
            http)   check_http "$ip" "$port" && status="OK" ;;
            redis)  check_redis "$ip" "$port" && status="OK" ;;
            postgres) check_postgres "$ip" "$port" && status="OK" ;;
        esac
        
        local end_time=$(python3 -c "import time; print(int(time.time()*1000))")
        local latency=$((end_time - start_time))
        
        if [ "$status" = "OK" ]; then
            healthy=$((healthy + 1))
            printf "%-25s %-20s ${GREEN}%-10s${NC} %sms\n" "$name" "${ip}:${port}" "● OK" "$latency"
        else
            printf "%-25s %-20s ${RED}%-10s${NC} -\n" "$name" "${ip}:${port}" "○ FAIL"
        fi
    done
    
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local pct=$((healthy * 100 / total))
    
    if [ "$healthy" -eq "$total" ]; then
        echo -e "\n${GREEN}✓ All services healthy: ${healthy}/${total} (${pct}%)${NC}"
    elif [ "$healthy" -gt 0 ]; then
        echo -e "\n${YELLOW}⚠ Partial health: ${healthy}/${total} (${pct}%)${NC}"
    else
        echo -e "\n${RED}✗ All services down: ${healthy}/${total} (${pct}%)${NC}"
    fi
    
    echo ""
}

check_single() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    if curl -sf --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

quick_check() {
    echo -e "\n${CYAN}Quick Health Check${NC}\n"
    
    check_single "API" "http://localhost:8000/health"
    check_single "Dashboard" "http://localhost:3001/"
    check_single "Survey Worker" "http://localhost:8018/health"
    check_single "Captcha Worker" "http://localhost:8019/health"
    
    echo ""
}

case "${1:-full}" in
    full)   run_health_check ;;
    quick)  quick_check ;;
    watch)  
        while true; do
            clear
            run_health_check
            echo -e "${YELLOW}Refreshing in 5s... (Ctrl+C to stop)${NC}"
            sleep 5
        done
        ;;
    *)
        echo "Usage: $0 [full|quick|watch]"
        echo ""
        echo "  full   Complete health check of all services"
        echo "  quick  Quick check of main endpoints"
        echo "  watch  Continuous monitoring (refresh every 5s)"
        ;;
esac
