# CLAUDE FIX OPERATIONS - QUICK REFERENCE

**You are tasked with:** Making this IELTSPRACTICE project production-ready for investor testing tomorrow.

**Total fixes:** 55 issues (47 original + 8 non-functional features) organized in 4 tiers (Critical, High, Medium, Low)

**Process:** 
1. Read one prompt from `CLAUDE_PRODUCTION_FIX_PROMPTS.md`
2. Implement the fix exactly as described
3. Test it works
4. Move to next issue

---

## 🔴 CRITICAL ISSUES (1-13) - FIX FIRST

These issues will make app fail completely if not fixed.

| # | Issue | File(s) | Time | Status |
|---|-------|---------|------|--------|
| 1 | Setup Ollama AI (local, free, unlimited) | `.env`, `/src/services/ollamaService.js` | 45min | ⬜ |
| 2 | Hardcoded Resend email key | `.env` line 4 | 20min | ⬜ |
| 3 | Hardcoded localhost URLs | `.env`, `/src/services/emailService.js` | 15min | ⬜ |
| 4 | Database not verified at startup | `/src/server.js` | 20min | ⬜ |
| 5 | No environment validation | `/src/server.js` | 20min | ⬜ |
| 6 | Admin IP whitelist blocks production | `/src/routes/adminAuthRoutes.js` lines 19-36 | 10min | ⬜ |
| 7 | 30+ console.logs expose user data | `/js/onboarding.js` | 15min | ⬜ |
| 8 | Hardcoded NextAuth secret | `/ielts-practice/.env.local` | 15min | ⬜ |
| 9 | Three separate databases | `/prisma/`, `/ielts-practice/prisma/` | 30min | ⬜ |
| 10 | Email service not configured | `/src/services/emailService.js` | 25min | ⬜ |
| 11 | Dead Next.js project wastes 500MB | `/ieltspractice-nextjs/` | 5min | ⬜ |
| 12 | No test accounts for demo | Database | 20min | ⬜ |
| 13 | **NEW** Live Hub Sessions not functional | `/dashboard.html` + database | 120min | ⬜ |

**Critical Subtotal:** 6-7 hours

---

## 🟠 HIGH ISSUES (14-31) - FIX SECOND

These prevent professional features from working.

| # | Issue | Time |
|---|-------|------|
| 14 | Missing error boundaries | 15min |
| 15 | No rate limiting on signup | 15min |
| 16 | CORS headers incomplete | 15min |
| 17 | No HTTPS enforcement | 20min |
| 18 | No CSRF protection | 25min |
| 19 | NextAuth config incomplete | 15min |
| 20 | No production logging | 20min |
| 21 | Unvalidated user input (SQL injection risk) | 25min |
| 22 | Mock data in CEO dashboard | 20min |
| 23 | No database backup strategy | 15min |
| 24 | Mixed CSS architecture | 20min |
| 25 | Plaintext passwords in seed | 10min |
| 26 | No API versioning | 20min |
| 27 | No graceful shutdown | 15min |
| 28 | Unused dependencies | 10min |
| 29 | **NEW** CEO Dashboard - Test Completions | 30min |
| 30 | **NEW** CEO Dashboard - Revenue by Month | 30min |
| 31 | **NEW** CEO Dashboard - Centre Performance | 30min |
| 32 | **NEW** Admin Announcements System | 45min |

**High Subtotal:** 4-5 hours

---

## 🟡 MEDIUM ISSUES (33-50) - FIX THIRD

These improve reliability and professionalism.

| # | Issue | Time | Status |
|---|-------|------|--------|
| 33 | No API health check endpoint | 10min | ⬜ |
| 34 | No request/response logging | 15min | ⬜ |
| 35 | Timezone handling issues | 20min | ⬜ |
| 36 | Broken social media links | 10min | ⬜ |
| 37 | Unhandled promise rejections | 15min | ⬜ |
| 38 | Missing API documentation | 20min | ⬜ |
| 39 | Incomplete error messages | 15min | ⬜ |
| 40 | Form ID selector mismatches | 15min | ⬜ |
| 41 | No request size limits | 10min | ⬜ |
| 42 | Database connection pooling | 15min | ⬜ |
| 43 | Missing error recovery | 15min | ⬜ |
| 44 | No session timeout handling | 15min | ⬜ |
| 45 | **NEW** Typing Dojo - Dynamic Practice Text | 45min | ⬜ |
| 46 | **NEW** Maps/Centres - Add Geo Coordinates | 50min | ⬜ |
| 47 | **NEW** Centres Display - Replace Hardcoded | 30min | ⬜ |
| 48 | Incomplete input sanitization | 20min | ⬜ |
| 49 | No monitoring/alerting setup | 15min | ⬜ |
| 50 | Incomplete Database Monitoring | 20min | ⬜ |

**Medium Subtotal:** 4-5 hours

---

## 🟢 LOW ISSUES (51-55)

Nice-to-have, only if time remains.

| # | Issue |
|---|-------|
| 51 | Outdated README |
| 52 | VSCode Settings in Repository |
| 53 | Unused Build Scripts |
| 54 | Incomplete Privacy Policy |
| 55 | Missing Mobile Responsiveness |

---

## 📋 EXECUTION ORDER

**MUST DO (Critical Path - 3-4 hours):**
```
Issue #1   → #2   → #3   → #4   → #5
   ↓         ↓        ↓       ↓       ↓
Issue #6   → #7   → #8   → #9   → #10
   ↓         ↓        ↓       ↓       ↓
Issue #11 → #12  → #13 (NEW: Live Hub)
   ↓
TEST: Can login as all 5 roles? Live sessions working?
```

**SHOULD DO (High Priority - 4-5 hours):**
```
Issue #14 → #15 → #16 → #17 → #18 → ... → #32 (including NEW CEO/Admin issues)
   ↓        ↓       ↓       ↓       ↓           ↓
TEST: All features work without errors? CEO/Admin dashboards showing real data?
```

**NICE TO DO (Medium Priority - 4-5 hours):**
```
Issue #33 → #34 → ... → #49 (including NEW Typing Dojo, Maps, Centres)
   ↓        ↓           ↓
TEST: System is professional & production-ready? New features functional?
```

---

## 🎯 MINIMUM VIABLE FOR INVESTOR (4-5 hours)

To pass basic investor IT testing with NEW features, you MUST have:

✅ Issues #1-13 (CRITICAL, including NEW Live Hub) = Foundation + core feature  
✅ Issues #29-32 (NEW: CEO/Admin features) = Real data dashboards  
✅ Issues #14,17,18,21 (Security) = No data leaks  

This gives investors confidence + shows working feature additions.

---

## 🚀 COMPREHENSIVE: PRODUCTION-READY (10-14 hours)

Do ALL 55 issues (CRITICAL #1-13 + HIGH #14-32 + MEDIUM #33-50, optional LOW #51-55):
-  ✅ All 13 CRITICAL issues fixed
- ✅ All 19 HIGH issues fixed (includes 4 new)
- ✅ All 17 MEDIUM issues fixed (includes 3 new)
- ✅ System is truly production-ready for investors

This is the complete investment-grade system.

---

## 👨‍💻 FOR CLAUDE TO START CODING

Go to: `CLAUDE_PRODUCTION_FIX_PROMPTS.md`

Read: "## CRITICAL ISSUE #1: Hardcoded Gemini API Key is Placeholder"

Follow the prompt under "### CLAUDE PROMPT 1:"

Implement exactly as specified, then confirm it works.

Then read CRITICAL ISSUE #2, and so on.

---

## ✨ SUCCESS METRICS

After all fixes, your system will:

1. ✅ Start without errors
2. ✅ Support 5 user roles all working
3. ✅ Show real data (not mock)
4. ✅ Have HTTPS + CSRF protection  
5. ✅ Have automated backups
6. ✅ Have structured logging
7. ✅ Handle errors gracefully
8. ✅ Prevent SQL injection
9. ✅ Prevent unauthorized access
10. ✅ Pass IT technician audit

---

**Time to production-ready: 6-8 hours**  
**Presentation time: Tomorrow morning**  
**Investor confidence: 📈 HIGH**

**LET'S GO! 🚀**
