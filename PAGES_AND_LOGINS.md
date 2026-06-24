# IELTS Practice - Complete Page & Login Reference Guide

Last Updated: April 12, 2026

---

## 🌐 ALL PAGES & URLS

### **PUBLIC PAGES** (No login required)

| Page | URL | Purpose |
|------|-----|---------|
| Landing/Home | `http://localhost:4000/index.html` | Main landing page |
| Login | `http://localhost:4000/login.html` | Main authentication portal |
| Signup | `http://localhost:4000/login/signup.html` | User registration |
| Forgot Password | `http://localhost:4000/login/forgot-password.html` | Password recovery |
| Verify Email | `http://localhost:4000/login/verify-email.html` | Email verification after signup |
| Terms & Conditions | `http://localhost:4000/termsconditions.html` | Legal terms |
| Privacy Policy | `http://localhost:4000/privacypolicy.html` | Privacy information |
| Contact | `http://localhost:4000/contact.html` | Contact page |
| 404 Error | `http://localhost:4000/404-new.html` | Not Found page |
| Partner Request | `http://localhost:4000/login/partner-request.html` | Partner signup form |

---

### **STUDENT PAGES** (Requires Student login)

| Page | URL | Purpose |
|------|-----|---------|
| Student Dashboard | `http://localhost:4000/dashboard.html` | Main student dashboard (skills, stats, leaderboard) |
| Typing Dojo | `http://localhost:4000/dashboard.html#dojo` | Typing speed practice |
| Education Centres | `http://localhost:4000/education-centre.html` | Find registered test centres |
| Test Room | `http://localhost:4000/dashboard/test-room.html` | Practice test interface |
| Student Progress | `http://localhost:4000/dashboard/student-progress.html` | View progress history |
| Practice Tests | `http://localhost:4000/pages/` | Various practice test modules |
| Reading Tests | `http://localhost:4000/Tests/practice/Reading/` | Reading section practice |
| Exam Dates | `http://localhost:4000/pages/exam-dates.html` | Official exam date schedule |

---

### **ADMIN PAGES** (Requires Admin login)

| Page | URL | Purpose |
|------|-----|---------|
| Admin Dashboard | `http://localhost:4000/admin.html` | Admin control panel |
| Admin Portal (Alt) | `http://localhost:4000/admin/admin.html` | Alternative admin interface |
| Premium Admin | `http://localhost:4000/new-premium-admin.html` | Advanced admin features |

---

### **TEACHER PAGES** (Requires Teacher login)

| Page | URL | Purpose |
|------|-----|---------|
| Teacher Dashboard | `http://localhost:4000/teacher-dashboard/teacher-dashboard.html` | Teacher control panel |
| Teacher Login | `http://localhost:4000/teacher-login/teacher-login.html` | Teacher authentication |

---

### **EDUCATION CENTRE PAGES** (Requires Centre login)

| Page | URL | Purpose |
|------|-----|---------|
| Centre Dashboard | `http://localhost:4000/education-centre.html` | Education centre control panel |
| Centre Login | `http://localhost:4000/education-login.html` | Centre authentication |
| Staff Portal | `http://localhost:4000/staff-portal-x72.html` | Staff management portal |

---

### **CEO PAGES** (Requires CEO login)

| Page | URL | Purpose |
|------|-----|---------|
| CEO Portal | `http://localhost:4000/portalceo.html` | CEO dashboard |
| CEO Dashboard | `http://localhost:4000/ceo.html` | CEO control panel |

---

## 🔐 LOGIN CREDENTIALS

### **Test Student Accounts** ✅ (Verified in Database)

**Account 1 - Verified Student (Ready to use)**
```
Email:    student@example.com
Password: StudentPass123!
Role:     STUDENT
Status:   ✅ Email Verified
Onboarding: Incomplete (modal will show)
```

**Account 2 - Verified Student**
```
Email:    futureenter53@gmail.com
Password: StudentPass123!
Role:     STUDENT
Status:   ✅ Email Verified
Onboarding: Complete
```

**Account 3 - Verified Student**
```
Email:    teststudent99@example.com
Password: StudentPass123!
Role:     STUDENT
Status:   ✅ Email Verified
Onboarding: Incomplete
```

**Account 4 - Verified Student**
```
Email:    jane.doe.test99@example.com
Password: StudentPass123!
Role:     STUDENT
Status:   ✅ Email Verified
Onboarding: Incomplete
```

### **Test Admin Account** 👨‍💼 (Currently STUDENT role, ready for testing)
```
Email:    admin@ieltspractice.com
Password: AdminPass123!
Role:     ADMIN (needs to be set in database)
Status:   Will be created
Onboarding: N/A
```

### **Test CEO Account** 👔 (Currently STUDENT role, ready for testing)
```
Email:    ceo@ieltspractice.com
Password: CeoPass123!
Role:     CEO (needs to be set in database)
Status:   Will be created
Onboarding: N/A
```

### **Test Teacher Account** 👨‍🏫 (Currently STUDENT role, ready for testing)
```
Email:    teacher@ieltspractice.com
Password: TeacherPass123!
Role:     TEACHER (needs to be set in database)
Status:   Will be created
Onboarding: N/A
```

### **Test Centre Account** 🏫 (Currently STUDENT role, ready for testing)
```
Email:    centre@ieltspractice.com
Password: CentrePass123!
Role:     CENTRE (needs to be set in database)
Status:   Will be created
Onboarding: N/A
```

### **Quick Test Accounts** (Auto-created via signup form)
Create any new account using:
```
Email:    anyemail+TIMESTAMP@test.com (e.g., test-1775965123456@test.com)
Password: TestPass123!
Username: Any username
Full Name: Any name
```
Then verify with code shown on screen.

---

## 📊 ROLE-BASED ACCESS MATRIX

| Role | Can Access | API Endpoints |
|------|-----------|---------------|
| **STUDENT** | `/dashboard.html`, `/education-centre.html` | `/api/user/*`, `/api/typing/*`, `/api/education/*` |
| **ADMIN** | `/admin.html`, all student pages | `/api/admin/*`, plus student endpoints |
| **TEACHER** | `/teacher-dashboard/*` | `/api/teacher/*` |
| **CENTRE** | `/education-centre.html` | `/api/education/*`, `/api/centre/*` |
| **CEO** | `/portalceo.html`, `/ceo.html` | `/api/admin/*`, all endpoints |

---

## 🔗 API ENDPOINTS

### **Authentication**
```
POST   /api/auth/signup              - Register new user
POST   /api/auth/login               - Login and get JWT token
POST   /api/auth/verify-email        - Verify email with code
POST   /api/auth/forgot-password     - Request password reset
POST   /api/auth/reset-password      - Reset password with token
```

### **User Profile**
```
GET    /api/user/profile             - Get user profile + onboarding status
POST   /api/user/onboarding          - Submit onboarding data (3 questions)
GET    /api/user/performance-history - Get practice history
GET    /api/user/stats               - Get user statistics
GET    /api/user/streak              - Get study streak info
GET    /api/user/next-exam-date      - Get next scheduled exam
```

### **Typing Practice**
```
GET    /api/typing/leaderboard       - Get global typing leaderboard
POST   /api/typing/result            - Submit typing test result
GET    /api/typing/history           - Get user's typing history
GET    /api/typing/stats             - Get typing statistics
```

### **Education & Tests**
```
GET    /api/education/centres        - List all education centres
GET    /api/education/tests          - Get available practice tests
POST   /api/education/register       - Register for test
GET    /api/education/results        - Get test results
```

### **Admin Only**
```
GET    /api/admin/users              - List all users
GET    /api/admin/reports            - Get system reports
POST   /api/admin/settings           - Update settings
GET    /api/admin/logs               - View activity logs
```

### **Teacher Only**
```
GET    /api/teacher/students         - List teaching students
POST   /api/teacher/lesson           - Create lesson
GET    /api/teacher/materials        - List materials
```

---

## 🚀 QUICK START TEST FLOW

### **1. Sign Up & Verify**
1. Go to `http://localhost:4000/login.html`
2. Click "Sign up"
3. Fill form:
   - Full Name: `Test User`
   - Email: `test-$(date +%s)@test.com`
   - Password: `TestPass123!`
   - Username: `testuser$(date +%s)`
4. Note the verification code shown
5. Submit verification code on verify page

### **2. Login**
1. Go to `http://localhost:4000/login.html`
2. Enter the email/password you just created
3. Click Login
4. Should redirect to `/dashboard.html`

### **3. See Onboarding Modal**
1. Modal appears on first login asking 3 questions:
   - When is your exam?
   - What is your target band? (5.5-9.0)
   - Where did you hear about us?
2. Fill in answers
3. Click "Complete Setup"
4. Page reloads
5. Next login: modal won't appear (onboarding complete)

### **4. Explore Dashboard**
- View Skills overview
- Check Stats & Rankings
- Access Typing Dojo
- View Leaderboard
- Find Education Centres

---

## 🔄 TESTING ONE PAGE AT A TIME

### **Test Student Dashboard**
```
1. Go to: http://localhost:4000/login.html
2. Login with: student@example.com / StudentPass123!
3. Target page: http://localhost:4000/dashboard.html
4. Check: Onboarding modal, skills, stats, leaderboard
```

### **Test Education Centre Page**
```
1. After login, go to: http://localhost:4000/education-centre.html
2. Check: List of centres, map, search/filter
3. Verify: Can see all test centres in Uzbekistan
```

### **Test Admin Dashboard** (once role is set)
```
1. Go to: http://localhost:4000/login.html
2. Login with: admin@ieltspractice.com / AdminPass123!
3. Target page: http://localhost:4000/admin.html
4. Check: Admin features, user management, reports
```

### **Test Teacher Dashboard** (once role is set)
```
1. Go to: http://localhost:4000/login.html
2. Login with: teacher@ieltspractice.com / TeacherPass123!
3. Target page: http://localhost:4000/teacher-dashboard/teacher-dashboard.html
4. Check: Student list, lessons, materials
```

---

## 📋 DATABASE TEST ACCOUNTS (Ready to Use)

```sql
-- Query to see all test accounts:
SELECT email, role, is_verified, "onboardingComplete" FROM "User";

-- Query to create more test students:
-- Use the signup endpoint instead
```

**Currently in Database:**
- ✅ 20+ STUDENT accounts (various verified states)
- ⚠️ 0 ADMIN accounts (role not yet assigned)
- ⚠️ 0 TEACHER accounts (role not yet assigned)
- ⚠️ 0 CENTRE accounts (role not yet assigned)
- ⚠️ 0 CEO accounts (role not yet assigned)

---

## 🎯 WHAT TO TEST NEXT

### **Phase 1: Individual Page Testing** (After checking all pages)
- [ ] Test each page URL loads without errors
- [ ] Check responsive design (mobile, tablet, desktop)
- [ ] Verify all buttons/forms work as expected
- [ ] Check console for JavaScript errors

### **Phase 2: Navigation Between Pages** (What we'll do next)
- [ ] Student → Dashboard → Education Centre → Back
- [ ] Admin Dashboard → User Management → Reports → Back
- [ ] Teacher Dashboard → Student List → Lessons → Back
- [ ] Navigation menu consistency across pages

### **Phase 3: Data Flow Testing** (After navigation works)
- [ ] Typing test results sync to leaderboard
- [ ] Onboarding data persists across sessions
- [ ] User progress updates in real-time
- [ ] Admin reports show actual user data

### **Phase 4: Cross-Role Testing** (After single roles work)
- [ ] Student can see own progress
- [ ] Teacher can see assigned students
- [ ] Admin can see all users
- [ ] CEO can see system-wide analytics

---

## 📞 COMMON ISSUES & SOLUTIONS

### **404 on page load**
→ Check URL spelling, port must be `:4000`, check if page file exists

### **"Access Denied" error**
→ Wrong role, login with correct account for that page

### **"Authentication Required"**
→ Token expired or not logged in, login again

### **Modal not appearing on first login**
→ Normal, means onboarding was already completed. Check:
```javascript
// In browser console:
localStorage.getItem('onboardingComplete')  // Should be 'true' if completed
```

### **Can't see test data in dropdowns**
→ API endpoints might not be returning data. Check Network tab in DevTools

---

## 📱 FRONTEND FRAMEWORK

- **Auth Guard**: `assets/auth-guard.js` - Protects pages, validates JWT
- **Global API Fetch**: `window.apiFetch()` - Automatic auth header
- **CSS**: Tailwind CSS via CDN
- **JS Framework**: PetiteVue for lightweight reactivity
- **Charts**: ApexCharts for data visualization
- **Maps**: Leaflet for centre location map

---

## ⚡ QUICK COMMANDS

### **Create new student account**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "New Student",
    "email": "new'$(date +%s)'@test.com",
    "password": "TestPass123!",
    "username": "student'$(date +%s)'"
  }'
```

### **Login and get token**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"StudentPass123!"}'
```

### **Test API with token**
```bash
TOKEN="your_token_here"
curl http://localhost:4000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### **Run E2E onboarding test**
```bash
node test-onboarding-e2e.js
```

---

## 🎉 READY TO GO!

**Next Step**: Start testing each page individually, then we'll connect them together with navigation flows!

Questions about any page or credential? Let me know! 🚀

