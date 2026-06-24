# Onboarding Modal - Debugging Guide

## Quick Verification Checklist

### 1. Backend is Running ✓
```bash
# Check if server is running on port 4000
curl http://localhost:4000/api/health
# Should return success or some response (not "Connection refused")
```

### 2. Database Has Onboarding Fields ✓
```bash
# Query the database
PGPASSWORD="20071214" psql -h localhost -U postgres -d ieltspractice -c \
  "SELECT id, email, \"onboardingComplete\" FROM \"User\" LIMIT 3;"

# Output should show onboardingComplete column (true/false)
```

### 3. API Endpoint Exists and Works
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"Pass123!"}' | jq -r '.token')

# Test /api/user/profile returns onboardingComplete
curl http://localhost:4000/api/user/profile -H "Authorization: Bearer $TOKEN" | jq .data.onboardingComplete

# Output should show: true or false
```

### 4. Modal Component File Exists
```bash
ls -la components/onboarding-modal.html
# Should show file exists and has content (~8KB)

# Check it's valid HTML
head -20 components/onboarding-modal.html | grep -i "onboarding-modal"
# Should show: <div id="onboarding-modal"...
```

### 5. Dashboard Has Wrapper Div
```bash
grep "onboarding-wrapper" dashboard.html
# Should show: <div id="onboarding-wrapper"></div>

# Verify it's in the right place (near top of body)
grep -n "onboarding-wrapper" dashboard.html
# Line should be low number (340)
```

### 6. onboarding.js Script Exists
```bash
ls -la js/onboarding.js
# Should show file exists (~297 lines)

wc -l js/onboarding.js
# Should show: 297

# Check for key functions
grep "function showOnboardingModal\|function checkOnboardingStatus\|async function" js/onboarding.js
```

---

## Browser Testing

### Step 1: Open Browser DevTools
- Press F12 or Right-click → Inspect
- Go to Console tab

### Step 2: Create New Test Account
- Go to http://localhost:4000/login.html
- Click "Sign up"
- Fill form: email = test-TIMESTAMP@test.com (e.g., test-1775965123@test.com)
- Submit
- Copy verification code shown on page

### Step 3: Verify Email
- Go back to tab or enter email and code
- Click verify

### Step 4: Login
- Submit login form with same email/password

### Step 5: Watch Console Messages
In DevTools console, you should see:
```
[onboarding] DOMContentLoaded - initializing onboarding
[onboarding] Modal HTML loaded, injecting into DOM
[onboarding] Modal HTML injected successfully
[onboarding] Event listeners attached
[onboarding] checkOnboardingStatus called
[onboarding] Profile fetched - onboardingComplete: false
[onboarding] Onboarding not complete - showing modal
```

### Step 6: Check if Modal Appeared
- Should see modal with 3 questions appear on dashboard
- Modal background should be slightly blurred
- Modal should be centered on screen

### Step 7: If Modal Didn't Appear
In DevTools console run:
```javascript
// Check if wrapper exists
document.getElementById('onboarding-wrapper')
// Should return: <div id="onboarding-wrapper">...</div>

// Check if modal was loaded
document.getElementById('onboarding-modal')
// Should return: <div id="onboarding-modal">...</div> or null

// Manually show it
const modal = document.getElementById('onboarding-modal');
if (modal) {
  modal.style.display = 'flex';
  console.log('Modal forcefully shown');
}

// Check onboarding.js is loaded
typeof showOnboardingModal
// Should return: "function"

typeof checkOnboardingStatus
// Should return: "function"
```

---

## Network Testing

### In DevTools Network Tab:

1. **Look for requests to**:
   ```
   /api/user/profile
   components/onboarding-modal.html
   /api/user/onboarding (when you submit)
   ```

2. **Check request details**:
   - Click on `/api/user/profile` request
   - Go to Response tab
   - Look for: `"onboardingComplete":false`
   - If not there, backend wasn't updated

3. **Check 401 errors**:
   - Any 401 status means JWT token issue
   - Re-login and try again

4. **Check onboarding-modal.html loading**:
   - Status should be 200 (not 404)
   - Size should be ~8KB
   - Content should be HTML

5. **Check POST to /api/user/onboarding**:
   - Status should be 200
   - Body should have success: true
   - Response should show onboardingComplete: true

---

## Common Issues & Fixes

### Issue: Console shows "onboarding-wrapper" is null
**Solution**: 
```bash
# Check wrapper exists in dashboard.html
grep -n "onboarding-wrapper" dashboard.html

# If not found, add it after <body> tag:
# <div id="onboarding-wrapper"></div>
```

### Issue: API returns "undefined" for onboardingComplete
**Solution**:
```bash
# Backend wasn't updated. Check userController.js line 247
grep -A 5 "onboardingComplete: user.onboardingComplete" src/controllers/userController.js

# If not found, update getUserProfile() function
```

### Issue: Modal loads but doesn't show (display: none)
**Solution**:
```javascript
// In console:
const modal = document.getElementById('onboarding-modal');
console.log(modal.style.display);  // Should be 'flex'
console.log(getComputedStyle(modal).display);  // Should be 'flex'

// If it's 'none', manually show:
modal.style.display = 'flex';
```

### Issue: "Failed to load onboarding modal" message
**Solution**:
```bash
# Component file not found
ls -la components/onboarding-modal.html

# If missing, create it from backup or repository
# Or check file permissions: chmod 644 components/onboarding-modal.html
```

### Issue: Modal shows but looks broken/unstyled
**Solution**:
- Check browser console for CSS errors
- Verify Tailwind CSS CDN is loaded: `<script src="https://cdn.tailwindcss.com"></script>`  
- Component has embedded CSS, should display in DevTools → Elements tab

---

## Advanced Debugging

### Check Exact State in IndexedDB/localStorage
```javascript
// In browser console:

// Check auth token
localStorage.getItem('authToken')
// Copy result, decode JWT: https://jwt.io

// Check onboarding flags
localStorage.getItem('onboardingComplete')
// Should be: null (first time) or 'true' (after completion)

sessionStorage.getItem('onboardingShown')
// Should be: 'true' if modal was checked
```

### Decode JWT to Verify Token Contents
```javascript
// In console:
function decodeJWT(token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  return payload;
}

const token = localStorage.getItem('authToken');
console.log(decodeJWT(token));
// Should show: { id: 123, role: 'STUDENT', email: 'user@test.com', exp: ... }
```

### Check Fetch Request Before Sending
```javascript
// In console - before modal check:
const token = localStorage.getItem('authToken');
fetch('/api/user/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log(d.data.onboardingComplete))
```

### Force Modal to Check Again
```javascript
// In console:
sessionStorage.removeItem('onboardingShown');  // Reset flag
localStorage.removeItem('onboardingComplete');  // Reset flag

// Then call:
checkOnboardingStatusFromAPI().then(status => {
  console.log('Onboarding complete:', status);
  if (!status) showOnboardingModal();
});
```

---

## Server Logs

### Check Node.js Server Output
```bash
# Terminal where server is running shows logs:
[onboarding] User updated successfully: 123
[onboarding] Request body: { examDate: '2024-12-15', ... }
```

### Enable Verbose Logging
Edit `src/controllers/userController.js` and look for lines starting with:
```javascript
console.log('[onboarding]')
console.error('[onboarding]')
```

All onboarding operations should log with `[onboarding]` prefix.

---

## Test Data

### Pre-existing Users (from database)
```
id | email                      | onboardingComplete
-----------+---+----+----+----+---+------
 2 | testauth2@example.com      | f (needs onboarding)
12 | futureenter53@gmail.com    | t (completed)
10 | teststudent99@example.com  | f (needs onboarding)
15 | jumalieviftuce@gmail.com   | t (completed)
```

### Create Fresh Test User
```bash
# Run the E2E test which creates a new user
node test-onboarding-e2e.js

# Or manually:
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test-'$(date +%s)'@test.com",
    "password": "TestPass123!",
    "username": "testuser'$(date +%s)'"
  }'
```

---

## Final Verification

If all checks pass:
1. ✅ Backend running
2. ✅ Database has onboarding fields
3. ✅ API endpoint returns data
4. ✅ Modal file exists
5. ✅ Dashboard wrapper exists
6. ✅ onboarding.js loaded

Then:
1. Create new user
2. Log in
3. Should see modal
4. Fill form
5. Click submit
6. Should see success message
7. Page reloads
8. Modal doesn't appear again

---

## Getting Help

### Provide This Information:

1. **Browser Console Output** (F12 → Console tab, copy all [onboarding] messages)
2. **Network Tab** (F12 → Network tab, filter by /api/user/profile and /api/user/onboarding)
3. **Current User State**:
   ```javascript
   {
     token: localStorage.getItem('authToken')?.substring(0,20) + '...',
     role: localStorage.getItem('role'),
     onboardingComplete: localStorage.getItem('onboardingComplete'),
     userId: JSON.parse(atob(localStorage.getItem('authToken')?.split('.')[1] || '{}')).id
   }
   ```
4. **Browser**: Chrome, Firefox, Safari, Edge?
5. **Error Message**: What exactly appears on screen?

