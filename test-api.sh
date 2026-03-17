#!/bin/bash

# ============================================================
# API Test Script - Tests all endpoints
# ============================================================
# Usage: bash test-api.sh [BASE_URL]
# Example: bash test-api.sh http://localhost:3000
# ============================================================

BASE_URL=${1:-http://localhost:3000}
echo "Testing API at: $BASE_URL"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_code=$3
    local description=$4
    local data=$5

    echo -n "Testing: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_code, Got: $http_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

echo ""
echo "🔍 Running API Tests..."
echo ""

# Test 1: Health Check
test_endpoint "GET" "/health" 200 "Health check"

# Test 2: Templates list
test_endpoint "GET" "/api/templates" 200 "Get all templates"

# Test 3: Fonts list
test_endpoint "GET" "/api/fonts" 200 "Get all fonts"

# Test 4: Backgrounds list
test_endpoint "GET" "/api/backgrounds" 200 "Get all backgrounds"

# Test 5: Assets list
test_endpoint "GET" "/api/assets" 200 "Get all assets"

# Test 6: Register user
TIMESTAMP=$(date +%s)
test_endpoint "POST" "/api/auth/register" 201 "Register new user" \
    "{\"email\":\"test$TIMESTAMP@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}"

# Test 7: Login (should fail with wrong credentials)
test_endpoint "POST" "/api/auth/login" 401 "Login with wrong credentials" \
    "{\"email\":\"wrong@example.com\",\"password\":\"wrong\"}"

# Test 8: Get user without token (should fail)
test_endpoint "GET" "/api/auth/me" 401 "Get current user without auth"

# Test 9: Get projects without token (should fail)
test_endpoint "GET" "/api/projects" 401 "Get projects without auth"

echo ""
echo "======================================"
echo "Test Results:"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo "======================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
