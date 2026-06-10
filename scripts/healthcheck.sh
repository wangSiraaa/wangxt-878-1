#!/usr/bin/env bash
# 健康检查脚本 - 用于 CI/CD 和 Docker 健康检查

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:8080/api}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:80}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== 航空货站装板复核系统 - 健康检查 ===${NC}"
echo ""

CHECK_PASS=0
CHECK_FAIL=0

check_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local expect_code="${4:-200}"
    local body="$5"
    local auth="$6"

    echo -n "  检查 $name ... "

    curl_args=(-s -o /dev/null -w "%{http_code}" -X "$method" --max-time 10)
    if [ -n "$body" ]; then
        curl_args+=(-H "Content-Type: application/json" -d "$body")
    fi
    if [ -n "$auth" ]; then
        curl_args+=(-H "Authorization: Bearer $auth")
    fi

    local code
    code=$(curl "${curl_args[@]}" "$url")

    if [ "$code" = "$expect_code" ]; then
        echo -e "${GREEN}通过 (HTTP $code)${NC}"
        CHECK_PASS=$((CHECK_PASS + 1))
        return 0
    else
        echo -e "${RED}失败 (期望 HTTP $expect_code, 实际 $code)${NC}"
        CHECK_FAIL=$((CHECK_FAIL + 1))
        return 1
    fi
}

echo "[1/4] MySQL 数据库连接检查"
check_endpoint "后端健康 (Liveness)" "$BACKEND_URL/health/liveness" "GET" "200"
echo ""

echo "[2/4] 后端业务接口连通性检查"
check_endpoint "数据库健康 (Readiness)" "$BACKEND_URL/health/readiness" "GET" "200"
check_endpoint "健康总览" "$BACKEND_URL/health" "GET" "200"
echo ""

echo "[3/4] 后端认证接口检查"
LOGIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"username":"operator1","password":"123456"}' \
    "$BACKEND_URL/auth/login" 2>/dev/null || true)
AUTH_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

if [ -n "$AUTH_TOKEN" ]; then
    echo -e "  检查 登录接口 ... ${GREEN}通过${NC}"
    CHECK_PASS=$((CHECK_PASS + 1))
else
    echo -e "  检查 登录接口 ... ${RED}失败${NC}"
    echo "    响应: $LOGIN_RESP"
    CHECK_FAIL=$((CHECK_FAIL + 1))
fi
echo ""

echo "[4/4] 前端页面检查"
check_endpoint "前端首页" "$FRONTEND_URL/" "GET" "200"
echo ""

echo "=============================================="
echo -e "通过: ${GREEN}$CHECK_PASS${NC} 项, 失败: ${RED}$CHECK_FAIL${NC} 项"
echo "=============================================="

if [ "$CHECK_FAIL" -gt 0 ]; then
    echo -e "${RED}❌ 健康检查失败，请检查日志和服务状态${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 健康检查全部通过，系统运行正常${NC}"
    exit 0
fi
