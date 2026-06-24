#!/bin/bash

echo "🧪 Testing AI Chat Integration..."
echo "================================="
echo ""

# Get a valid auth token (you'll need to provide this or login first)
# For testing, we'll create a demo request

echo "1️⃣  Testing AI Mentor Endpoint"
echo "Endpoint: POST /api/ai/mentor"
echo "Expected: 401 Unauthorized (no auth token)"
echo ""

curl -X POST http://localhost:4000/api/ai/mentor \
  -H "Content-Type: application/json" \
  -d '{"question":"How can I improve my IELTS writing band score?"}' \
  -v 2>&1 | grep -E "HTTP|"

echo ""
echo "================================="
echo "✅ To perform a full test:"
echo "1. Open http://localhost:4000/dashboard"
echo "2. Login with a student account"
echo "3. Click the purple robot icon (bottom-right)"
echo "4. Type a question and press Send"
echo "5. Watch the AI response appear in real-time"
echo ""
echo "📝 Chat Features:"
echo "   • Type any IELTS question"
echo "   • Press Enter or click Send"
echo "   • AI responds with personalized advice"
echo "   • Messages persist to database"
echo "   • Works with all student accounts"
