# 🛠️ CLAUDE CODE FIX PROMPT - Admin & CEO Login Protection

## TASK DESCRIPTION

Fix critical authentication issues:
1. **Admin Dashboard** (`/admin/admin.html`) is accessible without login
2. **CEO Dashboard** (`/portalceo.html`) is accessible without login
3. **Login pages** don't exist or aren't connected

---

## DETAILED PROBLEM ANALYSIS

### **ISSUE #1: Unprotected Admin Dashboard**

**File:** `/admin/admin.html`
**Current State:** Anyone can access without authentication

**Root Causes:**
- File `admin/admin.html` does NOT load `<script src="../assets/auth-guard.js"></script>`
- Without auth-guard, no token validation happens
- No login page redirects to admin dashboard

**Evidence:**
```html
<!-- MISSING in admin/admin.html -->
<script src="../assets/auth-guard.js"></script>
```

**What auth-guard does:**
- Checks if user has valid JWT token
- Validates user role is ADMIN or CEO
- Redirects to login if not authenticated
- protectedPages array includes 'admin.html'

---

### **ISSUE #2: Unprotected CEO Dashboard**

**File:** `/portalceo.html`
**Current State:** Anyone can access without authentication

**Root Causes:**
- File `portalceo.html` does NOT load `<script src="./assets/auth-guard.js"></script>`
- Without auth-guard, no protection at all
- No CEO login page exists to authenticate users
- User currently accesses directly via URL

**Evidence:**
```html
<!-- MISSING in portalceo.html -->
<script src="./assets/auth-guard.js"></script>
```

---

### **ISSUE #3: No Functional Login Pages**

**Problem:**
- `staff-portal-x72.html` exists but is just a styled HTML shell
- Not connected to any API endpoint
- No form submission logic
- No redirect after login
- Can't actually login as admin or CEO

**What exists:**
- `/login.html` - Works fine for STUDENT role
- `/staff-portal-x72.html` - Styled but non-functional
- No dedicated CEO login page

---

## REQUIRED FIXES

### **FIX #1: Protect Admin Dashboard**

**Action:** Add auth-guard to `/admin/admin.html`

**Location:** After line 10-11 (after other script tags, before closing `</head>`)

**Add this line:**
```html
<script src="../assets/auth-guard.js"></script>
```

**Full context (approximately line 10-15):**
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Portal | IELTS Practice</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  
  <!-- ADD THIS LINE: -->
  <script src="../assets/auth-guard.js"></script>
  
  <style>
```

**Expected result:**
- User without token redirected to `/login.html`
- User with STUDENT token redirected to `/dashboard.html`
- Only users with ADMIN or CEO tokens can access admin dashboard

---

### **FIX #2: Protect CEO Dashboard**

**Action:** Add auth-guard to `/portalceo.html`

**Location:** After line 8-10 (after iconify script, before chart.js or styles)

**Add this line:**
```html
<script src="./assets/auth-guard.js"></script>
```

**Full context (approximately line 1-15):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mission Control | IELTS Practice</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  
  <!-- ADD THIS LINE: -->
  <script src="./assets/auth-guard.js"></script>
  
  <link href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@700,600,400&f[]=satoshi@700,500,400&display=swap"
```

**Expected result:**
- User without token redirected to login page
- Only users with CEO role can access CEO dashboard
- All others redirected to their role-appropriate dashboard

---

### **FIX #3: Create Admin Login Functionality in staff-portal-x72.html**

**What needs to happen:**
1. Convert `staff-portal-x72.html` into a working ADMIN login page
2. Add login form that submits to `/api/auth/login` endpoint
3. Extract email/password from form
4. Send POST request with credentials
5. Store JWT token in localStorage
6. Redirect to `/admin/admin.html` on success
7. Show error message on failure

**Implementation Details:**

**A) Add admin-specific form (if not exists):**
- Email input field
- Password input field  
- "Login as Admin" button

**B) Add this script section (before closing `</body>`):**

```html
<script>
// Admin Login Handler
async function handleAdminLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const errorDiv = document.getElementById('admin-login-error');
  
  if (!email || !password) {
    if (errorDiv) errorDiv.textContent = 'Please enter email and password';
    return;
  }
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Store token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Check if user is admin
      if (data.role === 'ADMIN' || data.role === 'CEO') {
        window.location.href = '/admin/admin.html';
      } else {
        if (errorDiv) errorDiv.textContent = 'Only admin/CEO can access admin portal';
      }
    } else {
      if (errorDiv) errorDiv.textContent = data.message || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    if (errorDiv) errorDiv.textContent = 'Network error. Please try again.';
  }
}

// Attach to form on page load
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  if (form) {
    form.addEventListener('submit', handleAdminLogin);
  }
});
</script>
```

**C) Update form HTML to use these IDs:**
```html
<form id="admin-login-form">
  <input 
    type="email" 
    id="admin-email" 
    placeholder="Admin Email"
    required
  >
  
  <input 
    type="password" 
    id="admin-password" 
    placeholder="Password"
    required
  >
  
  <button type="submit">Login as Admin</button>
  
  <div id="admin-login-error" style="color: #dc2626; margin-top: 8px;"></div>
</form>
```

---

### **FIX #4: Create CEO Login Page**

**Option A (Recommended):** Create `/ceo-login.html` (new file)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEO Login | IELTS Practice</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6">CEO Login</h1>
      
      <form id="ceo-login-form">
        <input 
          type="email" 
          id="ceo-email" 
          placeholder="CEO Email"
          class="w-full p-2 border rounded mb-4"
          required
        >
        
        <input 
          type="password" 
          id="ceo-password" 
          placeholder="Password"
          class="w-full p-2 border rounded mb-4"
          required
        >
        
        <button 
          type="submit"
          class="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700"
        >
          Login as CEO
        </button>
        
        <div id="ceo-login-error" class="text-red-600 mt-4"></div>
      </form>
    </div>
  </div>

  <script>
  async function handleCEOLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('ceo-email').value;
    const password = document.getElementById('ceo-password').value;
    const errorDiv = document.getElementById('ceo-login-error');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('role', data.role);
        
        if (data.role === 'CEO') {
          window.location.href = '/portalceo.html';
        } else {
          errorDiv.textContent = 'Only CEO can access this portal';
        }
      } else {
        errorDiv.textContent = data.message || 'Login failed';
      }
    } catch (error) {
      errorDiv.textContent = 'Network error';
    }
  }

  document.getElementById('ceo-login-form').addEventListener('submit', handleCEOLogin);
  </script>
</body>
</html>
```

**Option B (Quick):** Reuse `staff-portal-x72.html` with CEO-specific login
- Add same login logic as admin
- Detect role and redirect accordingly

---

## SUMMARY OF CHANGES

| File | Change | Type |
|------|--------|------|
| `/admin/admin.html` | Add `<script src="../assets/auth-guard.js"></script>` | 1 line addition |
| `/portalceo.html` | Add `<script src="./assets/auth-guard.js"></script>` | 1 line addition |
| `/staff-portal-x72.html` | Add login form logic and API integration | Script addition |
| `/ceo-login.html` | NEW file - CEO login page | New file (optional) |

---

## TESTING CHECKLIST

After fixes:

- [ ] Without login token, accessing `/admin/admin.html` redirects to login
- [ ] Without login token, accessing `/portalceo.html` redirects to login
- [ ] Admin user (admin@ieltspractice.com / AdminPass123!) can login to admin dashboard
- [ ] CEO user (ceo@ieltspractice.com / CeoPass123!) can login to CEO dashboard
- [ ] Student user cannot access admin or CEO dashboards (redirects to student dashboard)
- [ ] Login form shows error on invalid credentials
- [ ] JWT token stored in localStorage after successful login
- [ ] User redirected to correct dashboard after login

---

## TEST CREDENTIALS

**Admin:**
```
Email:    admin@ieltspractice.com
Password: AdminPass123!
```

**CEO:**
```
Email:    ceo@ieltspractice.com
Password: CeoPass123!
```

**Student (should NOT access admin/CEO):**
```
Email:    student@example.com
Password: StudentPass123!
```

---

## EXPECTED BEHAVIOR AFTER FIX

**Scenario 1: No Authentication**
```
User tries to access: /admin/admin.html
Without token → Redirected to /login.html
```

**Scenario 2: Admin Login**
```
User goes to: /staff-portal-x72.html
Enters: admin@ieltspractice.com / AdminPass123!
Result → Redirected to /admin/admin.html with full access
```

**Scenario 3: CEO Login**
```
User goes to: /ceo-login.html (or staff-portal-x72.html)
Enters: ceo@ieltspractice.com / CeoPass123!
Result → Redirected to /portalceo.html with full access
```

**Scenario 4: Wrong Role**
```
Student user tries to access: /admin/admin.html (with valid student token)
Result → Redirected to /dashboard.html (student dashboard)
```

---

## REFERENCES

- **Auth Guard:** `/assets/auth-guard.js` (validates tokens and roles)
- **Student Dashboard:** `/dashboard.html` (example of correctly protected page)
- **API Endpoint:** `POST /api/auth/login` (handles authentication)
- **Protected Pages:** Array in auth-guard.js at line ~135

---

## NOTES

- **Role values:** STUDENT, ADMIN, CEO, TEACHER, CENTRE (all uppercase in database)
- **JWT Token:** Stored in `localStorage.authToken`
- **Redirect:** auth-guard redirects non-authenticated users to `/login.html`
- **Role check:** auth-guard checks user role and redirects to appropriate dashboard

