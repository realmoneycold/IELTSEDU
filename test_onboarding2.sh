#!/bin/bash

# Use the known test account from the conversation summary
API_URL="http://localhost:4000"
STUDENT_EMAIL="student@example.com"
STUDENT_PASSWORD="StudentPass123!"

echo "Testing with alternative student credentials..."

# Try admin first
echo -e "\n[DEBUG] Trying admin@ieltspractice.com..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@ieltspractice.com\",
    \"password\": \"AdminPass123!\"
  }")

echo "Response: $LOGIN_RESPONSE" | jq .
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo -e "\n✓ Got token!"
  
  # Get profile
  echo -e "\nGetting profile..."
  PROFILE=$(curl -s -X GET "$API_URL/api/user/profile" \
    -H "Authorization: Bearer $TOKEN")
  echo "$PROFILE" | jq .
  
  # Submit onboarding as admin
  echo -e "\nSubmitting onboarding data..."
  ONBOARDING=$(curl -s -X POST "$API_URL/api/user/onboarding" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"examDate\": \"2024-12-15\",
      \"isExamDateUnsure\": false,
      \"targetBand\": \"7.5\",
      \"sourceOfExposure\": \"Friend\"
    }")
  echo "$ONBOARDING" | jq .
else
  echo "Failed to login admin"
fi

