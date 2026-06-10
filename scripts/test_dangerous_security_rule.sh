#!/bin/bash
# ============================================================
# 危险品未安检不能装板 - 规则验证脚本
# 验证规则：危险品货邮单未安检通过，不能装板
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BACKEND_URL="${BACKEND_URL:-http://localhost:8080/api}"
CURL_OPTS="-s -w '\n%{http_code}'"

pass_count=0
fail_count=0

assert() {
    local desc="$1"
    local condition="$2"
    if eval "$condition"; then
        echo -e "  ${GREEN}✓${NC} $desc"
        pass_count=$((pass_count + 1))
    else
        echo -e "  ${RED}✗${NC} $desc"
        fail_count=$((fail_count + 1))
    fi
}

http_post() {
    local url="$1"
    local body="$2"
    local token="$3"
    local auth_header=""
    if [ -n "$token" ]; then
        auth_header="-H 'Authorization: Bearer $token'"
    fi
    eval "curl $CURL_OPTS -X POST -H 'Content-Type: application/json' $auth_header -d '$body' '$url'"
}

http_put() {
    local url="$1"
    local body="$2"
    local token="$3"
    local auth_header=""
    if [ -n "$token" ]; then
        auth_header="-H 'Authorization: Bearer $token'"
    fi
    eval "curl $CURL_OPTS -X PUT -H 'Content-Type: application/json' $auth_header -d '$body' '$url'"
}

get_token() {
    local resp="$1"
    echo "$resp" | head -n 1 | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

get_code() {
    local resp="$1"
    echo "$resp" | tail -n 1
}

get_field() {
    local resp="$1"
    local field="$2"
    echo "$resp" | head -n 1 | grep -o "\"$field\":\"*[^\",]*\"*" | head -1 | cut -d: -f2 | tr -d '"'
}

get_message() {
    local resp="$1"
    echo "$resp" | head -n 1 | grep -o '"message":"[^"]*"' | cut -d'"' -f4
}

echo -e "\n${CYAN}============================================================${NC}"
echo -e "${CYAN}🔍 危险品未安检不能装板 - 规则验证${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}后端地址: ${BACKEND_URL}${NC}"
echo ""

# ===== Step 0: 登录获取 token =====
echo -e "${YELLOW}[Step 0] 登录获取 token${NC}"

echo "  登录操作员账号..."
OP_LOGIN_RESP=$(http_post "$BACKEND_URL/auth/login" '{"username":"operator","password":"operator123"}' "")
OP_TOKEN=$(get_token "$OP_LOGIN_RESP")
assert "操作员登录成功" "[ -n '$OP_TOKEN' ]"

echo "  登录安检员账号..."
INS_LOGIN_RESP=$(http_post "$BACKEND_URL/auth/login" '{"username":"inspector","password":"inspector123"}' "")
INS_TOKEN=$(get_token "$INS_LOGIN_RESP")
assert "安检员登录成功" "[ -n '$INS_TOKEN' ]"

echo ""

# ===== Step 1: 准备测试数据 =====
echo -e "${YELLOW}[Step 1] 准备测试数据${NC}"

# 创建测试板箱
echo "  创建测试板箱..."
ULD_RESP=$(http_post "$BACKEND_URL/uld" \
    '{"uldCode":"TEST-DANGER-ULD-001","uldType":"PMC","flightId":1,"weightLimit":5000,"tareWeight":100}' \
    "$OP_TOKEN")
ULD_CODE=$(get_field "$ULD_RESP" "uldCode")
ULD_ID=$(get_field "$ULD_RESP" "id")
assert "创建板箱 $ULD_CODE 成功 (ID=$ULD_ID)" "[ -n '$ULD_ID' ]"

echo ""

# ===== 测试场景 1: 普通货物未安检不能装板 =====
echo -e "${YELLOW}[场景1] 普通货物未安检不能装板${NC}"

# 创建普通货邮单（未安检）
echo "  创建普通货邮单（未安检）..."
WB_NORMAL_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"TEST-WB-NORMAL-001","flightId":1,"shipper":"测试托运人","consignee":"测试收货人","pieces":10,"weight":500,"volume":1.0,"goodsDescription":"普通货物测试","dangerousFlag":false}' \
    "$OP_TOKEN")
WB_NORMAL_ID=$(get_field "$WB_NORMAL_RESP" "id")
assert "创建普通货邮单成功 (ID=$WB_NORMAL_ID)" "[ -n '$WB_NORMAL_ID' ]"

# 尝试装板（未安检）
echo "  测试: 普通货物未安检装板..."
LOAD_NORMAL_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_NORMAL_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_NORMAL_CODE=$(get_code "$LOAD_NORMAL_RESP")
LOAD_NORMAL_MSG=$(get_message "$LOAD_NORMAL_RESP")

assert "普通货物未安检装板被拒绝 (HTTP $LOAD_NORMAL_CODE)" "[ '$LOAD_NORMAL_CODE' != '200' ]"
assert "错误消息包含'未安检通过'说明" "[ -n \"\$(echo '$LOAD_NORMAL_MSG' | grep '未安检通过')\" ]"
echo "      返回消息: $LOAD_NORMAL_MSG"

echo ""

# ===== 测试场景 2: 危险品未安检不能装板（核心规则） =====
echo -e "${YELLOW}[场景2] 危险品未安检不能装板（核心规则）${NC}"

# 创建危险品货邮单（未安检）
echo "  创建危险品货邮单（未安检）..."
WB_DANGER_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"TEST-WB-DANGER-001","flightId":1,"shipper":"测试化工","consignee":"测试客户","pieces":2,"weight":100,"volume":0.3,"goodsDescription":"锂电池样本","dangerousFlag":true,"dangerousLevel":"LEVEL_2","remark":"UN3480 锂离子电池，未安检"}' \
    "$OP_TOKEN")
WB_DANGER_ID=$(get_field "$WB_DANGER_RESP" "id")
WB_DANGER_NO=$(get_field "$WB_DANGER_RESP" "waybillNo")
assert "创建危险品货邮单 $WB_DANGER_NO 成功 (ID=$WB_DANGER_ID)" "[ -n '$WB_DANGER_ID' ]"

# 尝试装板（危险品未安检）
echo "  测试: 危险品未安检装板..."
LOAD_DANGER_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_DANGER_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_DANGER_CODE=$(get_code "$LOAD_DANGER_RESP")
LOAD_DANGER_MSG=$(get_message "$LOAD_DANGER_RESP")

assert "危险品未安检装板被拒绝 (HTTP $LOAD_DANGER_CODE)" "[ '$LOAD_DANGER_CODE' != '200' ]"
assert "错误消息包含'危险品'说明" "[ -n \"\$(echo '$LOAD_DANGER_MSG' | grep '危险品')\" ]"
assert "错误消息包含'未安检通过'说明" "[ -n \"\$(echo '$LOAD_DANGER_MSG' | grep '未安检通过')\" ]"
echo "      返回消息: $LOAD_DANGER_MSG"

echo ""

# ===== 测试场景 3: 危险品安检通过后可以装板（验证规则完整性） =====
echo -e "${YELLOW}[场景3] 危险品安检通过后可以装板（验证规则完整性）${NC}"

# 安检通过
echo "  对危险品货邮单执行安检通过..."
SEC_RESP=$(http_put "$BACKEND_URL/waybill/$WB_DANGER_ID/security" '{"status":"PASSED","remark":"危险品安检通过，符合航空运输标准"}' "$INS_TOKEN")
SEC_CODE=$(get_code "$SEC_RESP")
assert "危险品安检通过成功 (HTTP $SEC_CODE)" "[ '$SEC_CODE' = '200' ]"

# 再次尝试装板（安检通过后）
echo "  测试: 危险品安检通过后装板..."
LOAD_OK_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_DANGER_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_OK_CODE=$(get_code "$LOAD_OK_RESP")
assert "危险品安检通过后装板成功 (HTTP $LOAD_OK_CODE)" "[ '$LOAD_OK_CODE' = '200' ]"

echo ""

# ===== 测试场景 4: 普通货物安检通过后可以装板 =====
echo -e "${YELLOW}[场景4] 普通货物安检通过后可以装板${NC}"

# 安检通过
echo "  对普通货邮单执行安检通过..."
SEC_NORMAL_RESP=$(http_put "$BACKEND_URL/waybill/$WB_NORMAL_ID/security" '{"status":"PASSED","remark":"普通货物安检通过"}' "$INS_TOKEN")
SEC_NORMAL_CODE=$(get_code "$SEC_NORMAL_RESP")
assert "普通货物安检通过成功 (HTTP $SEC_NORMAL_CODE)" "[ '$SEC_NORMAL_CODE' = '200' ]"

# 装板
echo "  测试: 普通货物安检通过后装板..."
LOAD_NORMAL_OK_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_NORMAL_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_NORMAL_OK_CODE=$(get_code "$LOAD_NORMAL_OK_RESP")
assert "普通货物安检通过后装板成功 (HTTP $LOAD_NORMAL_OK_CODE)" "[ '$LOAD_NORMAL_OK_CODE' = '200' ]"

echo ""

# ===== 测试场景 5: 危险品安检拒绝后不能装板 =====
echo -e "${YELLOW}[场景5] 危险品安检拒绝后不能装板${NC}"

# 创建另一个危险品货邮单
echo "  创建另一个危险品货邮单（安检拒绝）..."
WB_DANGER2_RESP=$(http_post "$BACKEND_URL/waybill" \
    '{"waybillNo":"TEST-WB-DANGER-002","flightId":1,"shipper":"测试化工2","consignee":"测试客户2","pieces":1,"weight":50,"volume":0.1,"goodsDescription":"易燃易爆液体","dangerousFlag":true,"dangerousLevel":"LEVEL_3","remark":"UN1203 汽油，未安检"}' \
    "$OP_TOKEN")
WB_DANGER2_ID=$(get_field "$WB_DANGER2_RESP" "id")

# 安检拒绝
echo "  对危险品货邮单执行安检拒绝..."
SEC_REJECT_RESP=$(http_put "$BACKEND_URL/waybill/$WB_DANGER2_ID/security" '{"status":"REJECTED","remark":"危险品不符合运输标准，安检拒绝"}' "$INS_TOKEN")
SEC_REJECT_CODE=$(get_code "$SEC_REJECT_RESP")
assert "危险品安检拒绝成功 (HTTP $SEC_REJECT_CODE)" "[ '$SEC_REJECT_CODE' = '200' ]"

# 尝试装板（安检拒绝）
echo "  测试: 危险品安检拒绝后装板..."
LOAD_REJECT_RESP=$(http_post "$BACKEND_URL/uld/load" "{\"waybillId\":$WB_DANGER2_ID,\"uldId\":$ULD_ID}" "$OP_TOKEN")
LOAD_REJECT_CODE=$(get_code "$LOAD_REJECT_RESP")
LOAD_REJECT_MSG=$(get_message "$LOAD_REJECT_RESP")

assert "危险品安检拒绝后装板被拒绝 (HTTP $LOAD_REJECT_CODE)" "[ '$LOAD_REJECT_CODE' != '200' ]"
echo "      返回消息: $LOAD_REJECT_MSG"

echo ""

# ===== 规则覆盖验证 =====
echo -e "${YELLOW}[规则验证] 代码逻辑校验${NC}"

echo "  验证 LoadService.java 中是否包含危险品校验逻辑..."
if grep -q "危险品货邮单未安检通过，不能装板" /Users/mingyuan/workspace/sihuo/wangxtw3/878/backend/src/main/java/com/cargo/uld/service/LoadService.java; then
    echo -e "    ${GREEN}✓${NC} LoadService.java 中存在危险品校验逻辑"
    pass_count=$((pass_count + 1))
    
    # 显示校验代码
    echo ""
    echo "  核心校验代码位置: LoadService.java 第53-58行"
    echo "  +-------------------------------------------------------------------+"
    echo "  | if (!Waybill.SecurityStatus.PASSED.equals(waybill.getSecurityStatus())) {"
    echo "  |     if (Boolean.TRUE.equals(waybill.getDangerousFlag())) {"
    echo "  |         throw BusinessException.of(\"危险品货邮单未安检通过，不能装板\");"
    echo "  |     }"
    echo "  |     throw BusinessException.of(\"货邮单未安检通过，不能装板\");"
    echo "  | }"
    echo "  +-------------------------------------------------------------------+"
else
    echo -e "    ${RED}✗${NC} LoadService.java 中未找到危险品校验逻辑"
    fail_count=$((fail_count + 1))
fi

echo ""

# ===== 测试结果汇总 =====
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}📊 测试结果汇总${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "  总测试数: ${CYAN}$((pass_count + fail_count))${NC}"
echo -e "  通过: ${GREEN}$pass_count${NC}"
echo -e "  失败: ${RED}$fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！危险品未安检不能装板规则验证成功！${NC}"
else
    echo -e "${RED}❌ 部分测试失败，请检查规则实现${NC}"
fi

echo -e "${CYAN}============================================================${NC}"
echo ""

exit $fail_count
