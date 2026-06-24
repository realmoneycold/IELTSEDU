# 🤖 AI Widget Integration Guide

## What Is It?

A **floating AI chatbot button** that appears in the bottom-right corner of your dashboard. When users click it, they get:
- ✅ AI Writing Assessment
- ✅ Real-time AI Mentor Chat
- ✅ Personalized Tips
- ✅ All personalized based on their logged-in account

## How It Works

1. **Floating Button** - User sees a purple sparkle (✨) button in bottom-right corner
2. **Click to Open** - Modal pops up with 3 quick action tabs
3. **Auto-Personalization** - AI knows who the user is & loads their performance data
4. **Three Modes**:
   - **📝 Assessment**: Submit writings, get instant IELTS feedback
   - **💬 Chat**: Ask AI mentor questions (knows their history)
   - **💡 Tips**: Get personalized improvement tips

---

## Installation (2 Steps)

### Step 1: Add Script to Dashboard

Add this single line to your `dashboard.html` **before the closing `</body>` tag**:

```html
<script src="./js/ai-widget.js"></script>
```

**Example:**
```html
...
    <script src="./js/dashboard.js"></script>
    <script src="./js/webrtcManager.js"></script>
    <script src="./js/ai-widget.js"></script>  <!-- Add this -->
</body>
</html>
```

### Step 2: Done!

That's it! The AI widget will automatically:
- ✅ Load on dashboard
- ✅ Know the authenticated user (from localStorage)
- ✅ Get the user's performance data from your database
- ✅ Provide personalized advice

---

## Features

### 📝 Assessment Tab
```
- User pastes their IELTS writing
- Selects Task 1 or Task 2
- Gets instant feedback:
  * Overall band
  * Individual scores (Task Fulfillment, Coherence, Vocabulary, Grammar)
  * Strengths & weaknesses
  * Improvement suggestions
```

### 💬 Chat Tab
```
- AI knows who the student is
- Has access to their test history
- Can personalize advice based on weak areas
- Example questions:
  * "How do I improve my grammar?"
  * "Tips for Task 2 essays?"
  * "What are my weak areas?"
```

### 💡 Tips Tab
```
- User selects weak areas:
  * Grammar
  * Vocabulary
  * Coherence
  * Task Fulfillment
- AI gives specific exercises & strategies
```

---

## How AI Knows the User

The widget automatically:
1. Reads `localStorage.userId` (set during login)
2. Reads `localStorage.userName`
3. Reads `localStorage.authToken`
4. Passes all to your backend API endpoints
5. Backend fetches student's history from database
6. AI gives personalized advice

**No extra work needed!** It all happens automatically.

---

## Customization Options

### Change Button Position
Edit `js/ai-widget.js`, find this section:
```javascript
.ai-widget-btn {
  bottom: 30px;      // Distance from bottom (change this)
  right: 30px;       // Distance from right (change this)
  ...
}
```

### Change Button Color
```javascript
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change gradient colors here */
```

### Change Button Icon
```javascript
<span class="ai-widget-icon">✨</span>  <!-- Change emoji here -->
```

To🎓 (scholar), 🚀 (rocket), 💡 (bulb), 🧠 (brain), etc.

### Change Modal Size
```javascript
.ai-widget-modal {
  width: 420px;       // Change width
  height: 600px;      // Change height
}
```

---

## API Integration

The widget uses these endpoints (already set up):

```javascript
// Assessment
DashboardAPI.assessWriting(writing, taskType)

// Mentoring
DashboardAPI.getAIMentoring(question)

// Tips
DashboardAPI.getWritingImprovementTips(weakAreas)

// Chat History (optional)
DashboardAPI.getAIChatHistory()

// Assessment History (optional)
DashboardAPI.getWritingAssessmentHistory()
```

All responses are automatically stored in your database!

---

## Mobile Responsive

✅ Automatically adapts to mobile screens:
- Button resizes
- Modal takes 90% width on mobile
- Touch-friendly buttons
- Works on all devices

---

## Troubleshooting

### Widget doesn't appear?
1. Check script tag is added to dashboard.html
2. Check browser console for errors
3. Verify user is logged in (check localStorage)

### "Not authenticated" error?
1. Make sure user has valid JWT token
2. Token should be in `localStorage.authToken`
3. Check API endpoint for auth errors

### AI not personalizing?
1. Make sure user ID is stored: `localStorage.userId`
2. Check that user has test history in database
3. Verify backend can fetch user performance data

### Styling issues?
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check if other CSS conflicts with widget styles

---

## Advanced: Different Positions

### Bottom-Left Corner
```css
.ai-widget-btn {
  left: 30px;    /* Add this */
  right: auto;   /* Remove from right */
}

.ai-widget-modal {
  left: 30px;
  right: auto;
}
```

### Top-Right Corner
```css
.ai-widget-btn {
  top: 30px;
  bottom: auto;
}

.ai-widget-modal {
  top: 100px;
  bottom: auto;
}
```

### Custom Modal (not floating)
Instead of floating button, embed directly in dashboard HTML.

---

## Analytics (Optional)

To track usage, you can add event logging:

```javascript
// Track when widget opens
window.addEventListener('ai-widget-opened', () => {
  console.log('User opened AI widget');
  // Send to analytics
});

// Track assessments submitted
window.addEventListener('ai-assessment-submitted', (e) => {
  console.log('Assessment submitted:', e.detail);
});
```

---

## Performance Notes

✅ Widget is lightweight:
- 30KB JavaScript file
- 5KB inline CSS
- Lazy loads modal content
- No impact on dashboard performance

---

## Multi-Language Support

To translate the UI, edit these strings in `js/ai-widget.js`:

```javascript
// Change these:
"Ask AI Mentor" → "Preguntame" 
"Submit Writing for Assessment" → "Enviar escritura para evaluación"
```

---

## Next Steps

1. ✅ Add script to dashboard.html
2. ✅ Refresh your browser
3. ✅ Test by clicking the button
4. ✅ Try assessment, chat, and tips
5. ✅ Launch to students!

---

## That's It! 🎉

Your students now have:
- ✅ Instant AI IELTS grading (personalized)
- ✅ AI mentor available 24/7
- ✅ No additional training needed
- ✅ All integrated seamlessly into dashboard

Questions? Check `js/ai-widget.js` for detailed comments or reach out for customization help.
