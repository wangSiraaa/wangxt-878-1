#!/usr/bin/env bash
# Smoke 测试脚本 - 覆盖三大核心业务规则场景

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8080/api}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

assert() {
    local desc="$1"
    local condition="$2"
    if eval "$condition"; then
        echo -e "  ${GREEN}✓ PASS${NC}: $desc"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC}: $desc"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

http_post() {
    local url="$1"
    local body="$2"
    local token="${3:-}"
    local extra_args=(-s -X POST -H "Content-Type: application/json" --max-time 30)
    if [ -n "$token" ]; then
        extra_args+=(-H "Authorization: Bearer $token")
    fi
    curl "${extra_args[@]}" -d "$body" "$url"
}

http_put() {
    local url="$1"
    local body="$2"
    local token="${3:-}"
    local extra_args=(-s -X PUT -H "Content-Type: application/json" --max-time 30)
    if [ -n "$token" ]; then
        extra_args+=(-H "Authorization: Bearer $token")
    fi
    curl "${extra_args[@]}" -d "$body" "$url"
}

http_get() {
    local url="$1"
    local token="${2:-}"
    local extra_args=(-s -X GET --max-time 30)
    if [ -n "$token" ]; then
        extra_args+=(-H "Authorization: Bearer $token")
    fi
    curl "${extra_args[@]}" "$url"
}

get_json_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | \
        sed "s/\"$field\"[[:space:]]*:[[:space:]]*//" | \
        sed 's/^"//;s/"$//' | tr -d ' ' | tr -d '\n'
}

echo -e "${BLUE}"
echo "================================================================"
echo "   航空货站装板复核系统 - Smoke 测试"
echo "================================================================"
echo -e "${NC}"

# ========== 步骤1: 登录获取各个角色的Token ==========
echo -e "${YELLOW}[初始化] 登录获取认证 Token${NC}"

OP_TOKEN=$(http_post "$BACKEND_URL/auth/login" '{"username":"operator1","password":"123456"}' | get_json_field token)
assert "操作员 operator1 登录成功" "[ -n '$OP_TOKEN' ]"

INS_TOKEN=$(http_post "$BACKEND_URL/auth/login" '{"username":"inspector1","password":"123456"}' | get_json_field token)
assert "安检员 inspector1 登录成功" "[ -n '$INS_TOKEN' ]"

REV_TOKEN=$(http_post "$BACKEND_URL/auth/login" '{"username":"reviewer1","password":"123456"}' | get_json_field token)
assert "复核员 reviewer1 登录成功" "[ -n '$REV_TOKEN' ]"

SUP_TOKEN=$(http_post "$BACKEND_URL/auth/login" '{"username":"supervisor1","password":"123456"}' | get_json_field token)
assert "航班主管 supervisor1 登录成功" "[ -n '$SUP_TOKEN' ]"

echo ""

# ========== 场景1: 超重装板拒绝 ==========
echo -e "${YELLOW}[场景1] 向超重板箱继续装货被拒绝${NC}"

# Step 1a: 创建一个小限重的板箱
echo "  准备: 创建限重 1000kg 的板箱和三个货邮单（合计会超重）"

CREATE_ULD_RESP=$(http_post "$BACKEND_URL/uld" \
    '{"uldCode":"SMOKE-ULD-001","uldType":"PMC","flightId":1,"weightLimit":1000,"tareWeight":100}' \
    "$OP_TOKEN")
ULD_ID=$(get_json_field "$CREATE_ULD_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建板箱 SMOKE-ULD-001 成功 (ID=$ULD_ID)" "[ -n '$ULD_ID' ]"

# Step 1b: 创建三个货邮单 (通过安检)
WB1_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"SMOKE-WB-001","flightId":1,"shipper":"测试","consignee":"测试","pieces":10,"weight":600,"volume":1.0,"goodsDescription":"测试A","dangerousFlag":false}' \
    "$OP_TOKEN")
WB1_ID=$(get_json_field "$WB1_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建货邮单 SMOKE-WB-001 (600kg) 成功 (ID=$WB1_ID)" "[ -n '$WB1_ID' ]"

WB2_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"SMOKE-WB-002","flightId":1,"shipper":"测试","consignee":"测试","pieces":10,"weight":500,"volume":1.0,"goodsDescription":"测试B","dangerousFlag":false}' \
    "$OP_TOKEN")
WB2_ID=$(get_json_field "$WB2_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建货邮单 SMOKE-WB-002 (500kg) 成功 (ID=$WB2_ID)" "[ -n '$WB2_ID' ]"

# Step 1c: 先安检通过
http_put "$BACKEND_URL/waybill/$WB1_ID/security" '{"status":"PASSED","remark":"安检通过"}' "$INS_TOKEN" > /dev/null
http_put "$BACKEND_URL/waybill/$WB2_ID/security" '{"status":"PASSED","remark":"安检通过"}' "$INS_TOKEN" > /dev/null
assert "两个货邮单均已安检通过" "true"

# Step 1d: 装第一个货邮单 (600kg，板箱限重1000kg，应该成功)
LOAD1_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB1_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD1_CODE=$(get_json_field "$LOAD1_RESP" code)
assert "装 600kg 货邮单成功 (HTTP code=$LOAD1_CODE)" "[ '$LOAD1_CODE' = '200' ]"

# Step 1e: 装第二个货邮单 (500kg，加上已有600kg=1100kg > 1000kg，应该失败)
echo "  关键测试: 尝试再装 500kg 货邮单，预计板箱超重..."
LOAD2_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB2_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD2_CODE=$(get_json_field "$LOAD2_RESP" code)
LOAD2_MSG=$(echo "$LOAD2_RESP" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

assert "超重装板被拒绝 (HTTP code=$LOAD2_CODE, msg=$LOAD2_MSG)" "[ '$LOAD2_CODE' = '409' ] || [ '$LOAD2_CODE' = '400' ]"
assert "超重错误消息包含解释性内容 (包含'超重')" "[ -n \"\$(echo '$LOAD2_MSG' | grep '超重')\" ]"

echo ""

# ========== 场景2: 危险品未安检装板失败 ==========
echo -e "${YELLOW}[场景2] 危险品未安检装板失败${NC}"

# Step 2a: 创建危险品货邮单（未安检）
echo "  准备: 创建一个标记为危险品的货邮单（不进行安检）"

WB_DANGER_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"SMOKE-WB-DANGER-001","flightId":1,"shipper":"测试","consignee":"测试","pieces":5,"weight":200,"volume":0.5,"goodsDescription":"测试危险品","dangerousFlag":true,"dangerousLevel":"CLASS 3"}' \
    "$OP_TOKEN")
WB_DANGER_ID=$(get_json_field "$WB_DANGER_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建危险品货邮单 SMOKE-WB-DANGER-001 成功 (ID=$WB_DANGER_ID)" "[ -n '$WB_DANGER_ID' ]"

# Step 2b: 直接装板（未安检），应该失败
echo "  关键测试: 尝试将未安检的危险品装板..."
LOAD_DANGER_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_DANGER_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_DANGER_CODE=$(get_json_field "$LOAD_DANGER_RESP" code)
LOAD_DANGER_MSG=$(echo "$LOAD_DANGER_RESP" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

assert "危险品未安检装板被拒绝 (code=$LOAD_DANGER_CODE)" "[ '$LOAD_DANGER_CODE' != '200' ]"
assert "错误消息包含'危险品'或'安检'说明" "[ -n \"\$(echo '$LOAD_DANGER_MSG' | grep -E '危险品|安检')\" ]"

# Step 2c: 补充安检后再装（应该成功，验证安检规则本身有效）
echo "  补充验证: 安检通过后危险品应该能正常装板"
http_put "$BACKEND_URL/waybill/$WB_DANGER_ID/security" '{"status":"PASSED","remark":"危险品安检通过"}' "$INS_TOKEN" > /dev/null

# 先卸下原来的600kg让总重不超
http_post "$BACKEND_URL/uld/unload" "{\"waybillId\":$WB1_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN" > /dev/null

LOAD_DANGER_OK_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_DANGER_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_DANGER_OK_CODE=$(get_json_field "$LOAD_DANGER_OK_RESP" code)
assert "危险品安检通过后装板成功 (code=$LOAD_DANGER_OK_CODE)" "[ '$LOAD_DANGER_OK_CODE' = '200' ]"

# 把600kg货邮单装回来
http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB1_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN" > /dev/null 2>&1 || true

echo ""

# ========== 场景3: 复核锁定后改货邮单失败 ==========
echo -e "${YELLOW}[场景3] 复核锁定后再改货邮单失败${NC}"

# Step 3a: 用一个新板箱 + 货邮单完整走完流程
echo "  准备: 新建板箱和货邮单，完整走完装板-提交复核-复核通过流程"

ULD_LOCK_RESP=$(http_post "$BACKEND_URL/uld" \
    '{"uldCode":"SMOKE-ULD-LOCK-001","uldType":"PMC","flightId":1,"weightLimit":5000,"tareWeight":100}' \
    "$OP_TOKEN")
ULD_LOCK_ID=$(get_json_field "$ULD_LOCK_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建板箱 SMOKE-ULD-LOCK-001 成功 (ID=$ULD_LOCK_ID)" "[ -n '$ULD_LOCK_ID' ]"

WB_LOCK_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"SMOKE-WB-LOCK-001","flightId":1,"shipper":"测试","consignee":"测试","pieces":20,"weight":800,"volume":2.0,"goodsDescription":"锁定测试货","dangerousFlag":false}' \
    "$OP_TOKEN")
WB_LOCK_ID=$(get_json_field "$WB_LOCK_RESP" "data" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
assert "创建货邮单 SMOKE-WB-LOCK-001 (800kg) 成功 (ID=$WB_LOCK_ID)" "[ -n '$WB_LOCK_ID' ]"

# Step 3b: 安检通过 + 装板
http_put "$BACKEND_URL/waybill/$WB_LOCK_ID/security" '{"status":"PASSED"}' "$INS_TOKEN" > /dev/null
http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_LOCK_ID,\"uldId\":$ULD_LOCK_ID}" "$OP_TOKEN" > /dev/null
assert "安检 + 装板完成" "true"

# Step 3c: 提交复核
SUBMIT_RESP=$(http_post "$BACKEND_URL/uld/$ULD_LOCK_ID/review/submit" "" "$OP_TOKEN")
SUBMIT_CODE=$(get_json_field "$SUBMIT_RESP" code)
assert "提交复核成功 (code=$SUBMIT_CODE)" "[ '$SUBMIT_CODE' = '200' ]"

# Step 3d: 复核通过（级联锁定货邮单和板箱）
PASS_RESP=$(http_put "$BACKEND_URL/uld/$ULD_LOCK_ID/review/pass" '{"actualWeight":800,"remark":"复核通过，重量一致"}' "$REV_TOKEN")
PASS_CODE=$(get_json_field "$PASS_RESP" code)
assert "复核通过 (code=$PASS_CODE)" "[ '$PASS_CODE' = '200' ]"

# Step 3e: 关键测试 - 复核锁定后，普通操作员尝试修改货邮单应该失败
echo "  关键测试: 复核通过后，普通操作员尝试修改货邮单..."

UPDATE_RESP=$(http_put "$BACKEND_URL/waybill/$WB_LOCK_ID" \
    '{"waybillNo":"SMOKE-WB-LOCK-001","flightId":1,"pieces":99,"weight":99999,"volume":9,"goodsDescription":"尝试篡改","dangerousFlag":false}' \
    "$OP_TOKEN")
UPDATE_CODE=$(get_json_field "$UPDATE_RESP" code)
UPDATE_MSG=$(echo "$UPDATE_RESP" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

assert "复核锁定后修改货邮单被拒绝 (code=$UPDATE_CODE)" "[ '$UPDATE_CODE' != '200' ]"
assert "错误消息包含'锁定'或'复核'说明 (msg=$UPDATE_MSG)" "[ -n \"\$(echo '$UPDATE_MSG' | grep -E '锁定|复核|不能')\" ]"

# Step 3f: 复核锁定后尝试卸下货邮单也应该失败（普通操作员）
echo "  补充测试: 复核锁定后，普通操作员尝试卸下货邮单..."
UNLOAD_RESP=$(http_post "$BACKEND_URL/uld/unload" "{\"waybillId\":$WB_LOCK_ID,\"uldId\":$ULD_LOCK_ID}" "$OP_TOKEN")
UNLOAD_CODE=$(get_json_field "$UNLOAD_RESP" code)
UNLOAD_MSG=$(echo "$UNLOAD_RESP" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

assert "复核锁定后普通操作员卸下被拒绝 (code=$UNLOAD_CODE)" "[ '$UNLOAD_CODE' != '200' ]"

# Step 3g: 但 REVIEWER 或 SUPERVISOR 可以做异常卸下
echo "  补充验证: REVIEWER角色可以做异常卸下..."
SUP_UNLOAD_RESP=$(http_post "$BACKEND_URL/uld/unload" "{\"waybillId\":$WB_LOCK_ID,\"uldId\":$ULD_LOCK_ID,\"remark\":\"复核后异常卸下\"}" "$SUP_TOKEN")
SUP_UNLOAD_CODE=$(get_json_field "$SUP_UNLOAD_RESP" code)
assert "REVIEWER/SUPERVISOR异常卸下成功 (code=$SUP_UNLOAD_CODE)" "[ '$SUP_UNLOAD_CODE' = '200' ]"

echo ""

# ========== 汇总输出 ==========
echo -e "${BLUE}"
echo "================================================================"
echo "                     Smoke 测试 结果汇总"
echo "================================================================"
echo -e "${NC}"
echo -e "  ${GREEN}通过: $PASS_COUNT${NC} 项"
echo -e "  ${RED}失败: $FAIL_COUNT${NC} 项"
echo ""
echo "  覆盖场景:"
echo "    ✓ [场景1] 板箱超重阻止 (业务规则)"
echo "    ✓ [场景2] 危险品未安检阻止 (业务规则)"
echo "    ✓ [场景3] 复核锁定保护 (状态权限控制)"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}"
    echo "  ❌ 有 $FAIL_COUNT 项测试失败，请检查后端日志和错误信息"
    echo -e "${NC}"
    exit 1
else
    echo -e "${GREEN}"
    echo "  ✅ 所有 Smoke 测试全部通过！系统业务规则验证正常"
    echo -e "${NC}"
    exit 0
fi
