# 🗺️ SITE MAP - All Pages & Connections

## CURRENT STRUCTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                      🏠 landing page                            │
│              http://localhost:4000/index.html                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
           ┌───────▼────────┐
           │ 🔐 LOGIN PAGE  │
           │  login.html    │
           └───────┬────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
   📝 SIGNUP    ✉️  VERIFY    🔑 RESET PASSWORD
  login/        verify-email.html  forgot-password.html
  signup.html    
      
      ┌─────────────────────────────────────────────────┐
      │ AFTER LOGIN - Different pages for each role:   │
      └──────────────┬──────────────────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────┬──────────────┐
        │            │            │              │              │
        ▼            ▼            ▼              ▼              ▼
    👨‍💼 STUDENT  👨‍💼 ADMIN   👨‍🏫 TEACHER  🏫 CENTRE   👔 CEO
    
    ┌──────────────────────────────────────────────────────────────┐
    │ STUDENT DASHBOARD (login.html?role=student)                 │
    │ or: http://localhost:4000/dashboard.html                    │
    │                                                              │
    │  ├─ 📊 Skills Overview                                       │
    │  │  ├─ Listening score                                       │
    │  │  ├─ Reading score                                         │
    │  │  ├─ Writing score                                         │
    │  │  └─ Speaking score                                        │
    │  │                                                           │
    │  ├─ 📈 Statistics                                            │
    │  │  ├─ Total session count                                   │
    │  │  ├─ Study hours                                           │
    │  │  ├─ Current streak                                        │
    │  │  └─ Global ranking                                        │
    │  │                                                           │
    │  ├─ ⌨️ Typing Dojo                                           │
    │  │  ├─ Speed test                                            │
    │  │  ├─ Accuracy tracking                                     │
    │  │  └─ WPM calculation                                       │
    │  │                                                           │
    │  ├─ 👥 Leaderboard                                           │
    │  │  ├─ Global rankings                                       │
    │  │  ├─ Friend rankings                                       │
    │  │  └─ Category rankings                                     │
    │  │                                                           │
    │  └─ 🏛️ Education Centres                                     │
    │     └─ http://localhost:4000/education-centre.html          │
    │        ├─ List all centres                                   │
    │        ├─ Map display                                        │
    │        ├─ Search/filter                                      │
    │        ├─ Centre details                                     │
    │        └─ Booking interface                                  │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │ ADMIN DASHBOARD                                              │
    │ http://localhost:4000/admin.html                             │
    │                                                              │
    │  ├─ 👥 User Management                                       │
    │  │  ├─ Add/edit/delete users                                 │
    │  │  ├─ Assign roles                                          │
    │  │  └─ View user activity                                    │
    │  │                                                           │
    │  ├─ 📊 Reports                                               │
    │  │  ├─ User statistics                                       │
    │  │  ├─ Test analytics                                        │
    │  │  └─ System health                                         │
    │  │                                                           │
    │  ├─ ⚙️ Settings                                              │
    │  │  ├─ Configure tests                                       │
    │  │  ├─ Manage centres                                        │
    │  │  └─ System settings                                       │
    │  │                                                           │
    │  └─ 📋 Logs                                                  │
    │     ├─ Activity log                                          │
    │     └─ Error log                                             │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │ TEACHER DASHBOARD                                            │
    │ http://localhost:4000/teacher-dashboard/teacher-dashboard.html
    │                                                              │
    │  ├─ 👥 Students                                              │
    │  │  ├─ List of students                                      │
    │  │  ├─ Individual progress                                   │
    │  │  └─ Communication                                         │
    │  │                                                           │
    │  ├─ 📚 Materials                                              │
    │  │  ├─ Upload materials                                      │
    │  │  ├─ Organize content                                      │
    │  │  └─ Share with students                                   │
    │  │                                                           │
    │  ├─ 📝 Lessons                                               │
    │  │  ├─ Create lessons                                        │
    │  │  ├─ Schedule classes                                      │
    │  │  └─ Track attendance                                      │
    │  │                                                           │
    │  └─ 📊 Reports                                               │
    │     ├─ Student performance                                   │
    │     └─ Class analytics                                       │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │ CENTRE DASHBOARD                                             │
    │ http://localhost:4000/education-centre.html                  │
    │                                                              │
    │  ├─ 📍 Centre Info                                            │
    │  │  ├─ Location details                                      │
    │  │  ├─ Facilities                                            │
    │  │  └─ Contact info                                          │
    │  │                                                           │
    │  ├─ 📅 Exam Schedule                                         │
    │  │  ├─ Upcoming exams                                        │
    │  │  ├─ Registrations                                         │
    │  │  └─ Results                                               │
    │  │                                                           │
    │  ├─ 👥 Staff Management                                      │
    │  │  ├─ Staff list                                            │
    │  │  ├─ Assign roles                                          │
    │  │  └─ Manage invigilators                                   │
    │  │                                                           │
    │  └─ 📊 Reports                                               │
    │     ├─ Exam statistics                                       │
    │     └─ Centre performance                                    │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │ CEO PORTAL                                                   │
    │ http://localhost:4000/portalceo.html                         │
    │ or: http://localhost:4000/ceo.html                           │
    │                                                              │
    │  ├─ 📊 Business Analytics                                    │
    │  │  ├─ Revenue metrics                                       │
    │  │  ├─ Growth trends                                         │
    │  │  └─ Forecasts                                             │
    │  │                                                           │
    │  ├─ 👥 All Users                                             │
    │  │  ├─ User demographics                                     │
    │  │  ├─ Activity summary                                      │
    │  │  └─ User growth                                           │
    │  │                                                           │
    │  ├─ 🏛️ Centres Network                                       │
    │  │  ├─ All centres                                           │
    │  │  ├─ Performance by centre                                 │
    │  │  └─ Regional analytics                                    │
    │  │                                                           │
    │  └─ ⚙️ System Management                                      │
    │     ├─ Global settings                                       │
    │     ├─ Feature flags                                         │
    │     └─ Maintenance                                           │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘
```

---

## PAGES NOT YET CONNECTED

These pages exist but need navigation links:

```
PUBLIC INFO PAGES:
├─ Terms & Conditions       /termsconditions.html
├─ Privacy Policy           /privacypolicy.html
├─ Contact                  /contact.html
├─ 404 Error Page           /404-new.html
└─ Partner Request          /login/partner-request.html

PRACTICE TEST PAGES (Nested):
├─ Test Room                /dashboard/test-room.html
├─ Student Progress         /dashboard/student-progress.html
├─ Reading Tests            /Tests/practice/Reading/...
├─ Exam Dates              /pages/exam-dates.html
└─ Education Centres (Alt)  /pages/education-centres.html

ALTERNATIVE PORTALS:
├─ Premium Admin            /new-premium-admin.html
├─ Staff Portal             /staff-portal-x72.html
├─ Teacher Login (Alt)      /teacher-login/teacher-login.html
├─ Education Login (Alt)    /education-login.html
└─ Admin (Alt)              /admin/admin.html
```

---

## MISSING NAVIGATION ELEMENTS

**Currently Missing:**
- [ ] Header/Navigation menu on dashboard
- [ ] Sidebar/Navigation on admin pages
- [ ] Back buttons between connected pages
- [ ] Logout button integration
- [ ] Role-based menu visibility
- [ ] Mobile navigation
- [ ] Breadcrumb navigation
- [ ] Footer with links

**Need to Add:**
- [ ] Header component (appears on all pages)
- [ ] Footer component (appears on all pages)
- [ ] Navigation menu (role-based)
- [ ] Logout functionality
- [ ] Responsive mobile menu

---

## NEXT STEPS - PAGE CONNECTIONS

### Phase 1: Add Navigation Headers
- [ ] Create reusable header component
- [ ] Add logout button
- [ ] Add role-based menu
- [ ] Include navigation links

### Phase 2: Connect Dashboard Links
- [ ] Dashboard → Education Centre
- [ ] Education Centre → Dashboard (back)
- [ ] Dashboard → Test Room
- [ ] Dashboard → Student Progress
- [ ] Dashboard → Leaderboard section

### Phase 3: Connect Admin Pages
- [ ] Admin → User Management
- [ ] User Management → Individual user details
- [ ] Admin → Reports
- [ ] Admin → Settings

### Phase 4: Cross-Role Navigation
- [ ] Logout from any page → Login
- [ ] Login → Correct dashboard based on role
- [ ] Admin can view student dashboards
- [ ] CEO can access all admin pages

---

## CURRENT CONNECTIONS ✅

✅ Login → Verify Email
✅ Login → Forgot Password
✅ Dashboard loads with data
✅ Onboarding modal appears (new users only)
✅ Auth guard prevents unauthorized access

---

