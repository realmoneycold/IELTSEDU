#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:4000"
STUDENT_EMAIL="new-student-$(date +%s)@test.com"
STUDENT_PASSWORD="TestPass123!"

echo -e "${BLUE}=== IELTS Practice Onboarding Test ===${NC}\n"

# Step 1: Sign up
echo -e "${BLUE}[1] Signing up new student...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"full_name\": \"Test Student\",
    \"email\": \"$STUDENT_EMAIL\",
    \"password\": \"$STUDENT_PASSWORD\",
    \"username\": \"teststudent$(date +%s)\"
  }")

echo "Response: $SIGNUP_RESPONSE"
echo ""

# Step 2: Verify email (check database directly - use existing verified user)
STUDENT_EMAIL="student@example.com"
STUDENT_PASSWORD="StudentPass123!"

echo -e "${BLUE}[2] Logging in with verified student...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$STUDENT_EMAIL\",
    \"password\": \"$STUDENT_PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "Token: ${GREEN}${TOKEN:0:20}...${NC}\n"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token!${NC}"
  exit 1
fi

# Step 3: Get profile to check onboarding status
echo -e "${BLUE}[3] Fetching user profile...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/user/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROFILE_RESPONSE" | jq .
ONBOARDING_COMPLETE=$(echo "$PROFILE_RESPONSE" | jq '.data.onboardingComplete')
echo -e "Onboarding Complete: ${GREEN}$ONBOARDING_COMPLETE${NC}\n"

# Step 4: Submit onboarding data
echo -e "${BLUE}[4] Submitting onboarding data...${NC}"
ONBOARDING_RESPONSE=$(curl -s -X POST "$API_URL/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"examDate\": \"2024-12-15\",
    \"isExamDateUnsure\": false,
    \"targetBand\": \"7.5\",
    \"sourceOfExposure\": \"Friend\"
  }")

echo "Response: $ONBOARDING_RESPONSE" | jq .
echo ""

# Step 5: Get profile again to verify data was saved
echo -e "${BLUE}[5] Verifying data was saved...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/user/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROFILE_RESPONSE" | jq .

