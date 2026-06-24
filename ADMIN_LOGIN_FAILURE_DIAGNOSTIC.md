# 🔍 DIAGNOSTIC PROMPT - Admin Login Failure Investigation

## ISSUE IDENTIFIED

**User tried:** `admin@ieltspractice.com / AdminPass123!` at `/staff-portal-x72.html`  
**Error received:** `Invalid email or password`  
**Status:** Login auth system is working, but accounts don't exist

---

## ROOT CAUSE - Database Analysis

### **Fact #1: Admin/CEO Accounts Don't Exist**
Queried database:
```sql
SELECT email, role FROM "User" 
WHERE email IN ('admin@ieltspractice.com', 'ceo@ieltspractice.com', 'teacher@ieltspractice.com', 'centre@ieltspractice.com');
```

**Result:** `(0 rows)` — ZERO matches. These accounts do NOT exist in database.

### **Fact #2: ALL Accounts Are Currently STUDENT Role**
Queried database:
```sql
SELECT email, role FROM "User" ORDER BY id LIMIT 30;
```

**Result:**
```
id | email                        | role    | verified
---+------------------------------+---------+----------
1  | testauth@example.com         | STUDENT | t
2  | testauth2@example.com        | STUDENT | f
3  | jane.doe.test99@example.com  | STUDENT | t
... (22 more students)
20 | testuser-1775965136605@test.com | STUDENT | t

-- NO admin, NO CEO, NO teacher, NO centre accounts exist --
```

### **Fact #3: 22 STUDENT Accounts Available**
All 22 accounts in database have role = `STUDENT`

---

## WHY LOGIN FAILS

```
1. User enters email: admin@ieltspractice.com
2. Login API (POST /api/auth/login) searches database for this email
3. Query finds: NO USER with that email
4. API response: { success: false, message: "Invalid email or password" }
5. Result: ❌ Login fails
```

**The auth system works correctly** — it properly rejects non-existent users with "Invalid email or password" (for security, doesn't say "user not found").

---

## SOLUTION REQUIRED

There are TWO options to fix this:

### **OPTION A: Create Accounts Via SQL (Fastest)**

Need to create new user records directly in database with:
- Email: `admin@ieltspractice.com`, Role: `ADMIN`, password hash
- Email: `ceo@ieltspractice.com`, Role: `CEO`, password hash
- Email: `teacher@ieltspractice.com`, Role: `TEACHER`, password hash
- Email: `centre@ieltspractice.com`, Role: `CENTRE`, password hash

**Challenge:** Need to hash password `AdminPass123!` using bcrypt with correct salt before inserting.

---

### **OPTION B: Create Accounts Via Signup API + Update Role (Safer)**

**Step 1: Create via signup endpoint**
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Admin User",
    "email": "admin@ieltspractice.com",
    "password": "AdminPass123!",
    "username": "admin"
  }'
```

**Step 2: Verify email** (use code from response)
```bash
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ieltspractice.com",
    "code": "received_code_here"
  }'
```

**Step 3: Update role in database** to ADMIN
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@ieltspractice.com';
```

Repeat for CEO, TEACHER, CENTRE.

---

## WHAT NEEDS TO BE DONE

### **ACTION ITEMS:**

1. **Decide approach:** SQL insert vs Signup API + role update?
2. **Create admin account** with email + password credentials that work
3. **Create CEO account** with email + password credentials that work
4. **Create teacher account** (optional)
5. **Create centre account** (optional)
6. **Verify login works** with real accounts
7. **Update documentation** with actual working credentials

---

## WORKING CREDENTIALS (Currently Available)

These STUDENT accounts **CAN login** (but only access student dashboard):

```
Email:    testauth@example.com
Password: StudentPass123!
Role:     STUDENT
Verified: YES ✓

Email:    jane.doe.test99@example.com
Password: StudentPass123!
Role:     STUDENT
Verified: YES ✓

Email:    futureenter53@gmail.com
Password: StudentPass123!
Role:     STUDENT
Verified: YES ✓
```

---

## INVESTIGATION NEEDED

### **Question 1: What Are the Admin/CEO Passwords?**
We suggested `AdminPass123!` and `CeoPass123!`, but these accounts don't exist.
- Are there existing admin/CEO accounts in the system?
- What credentials should they have?
- Should we create new accounts with suggested passwords?

### **Question 2: How Should Accounts Be Created?**
- **Option A:** Create directly in database via SQL (need bcrypt hash)
- **Option B:** Use signup API then update roles (safer, follows normal flow)
- **Option C:** Ask if there's an admin registration script?

### **Question 3: Should We Also Create Teacher & Centre Accounts?**
- Currently planning fixtures for: ADMIN, CEO, TEACHER, CENTRE
- Should we create all 4 now, or just ADMIN and CEO for testing?

---

## EXPECTED WORKFLOW AFTER FIX

**Current (Broken):**
```
User: admin@ieltspractice.com
Password: AdminPass123!
Result: ❌ Invalid email or password
```

**After Fix:**
```
User: admin@ieltspractice.com
Password: AdminPass123!
Result: ✅ Login successful
Redirect: /admin/admin.html
```

---

## VERIFICATION STEPS

After accounts are created, these should all work:

```
✓ Login: admin@ieltspractice.com / AdminPass123! → /admin/admin.html
✓ Login: ceo@ieltspractice.com / CeoPass123! → /portalceo.html
✓ Login: student@example.com / StudentPass123! → /dashboard.html
✓ Access /admin/admin.html without auth → redirected to /login.html
✓ Access /portalceo.html without auth → redirected to /login.html
```

---

## FILES TO CHECK

1. **Database:** Is there a seed script that creates these accounts?
   - Check: `/scripts/` directory
   - Check: Prisma seed configuration

2. **Backend:** Is there admin initialization endpoint?
   - Check: `/src/routes/` for admin setup routes
   - Check: `/src/controllers/` for admin creation

3. **Documentation:** Are there setup instructions?
   - Check: `README.md` or setup guides
   - Look for: "run migrations" or "create admin" steps

---

## SUMMARY

**Problem:** Admin/CEO accounts don't exist in database  
**Solution:** Create them (via SQL or signup API)  
**Blocker:** Need to decide method and get passwords  
**Next:** Once accounts exist, login will work and redirect properly

---

## CLAUDE TASK

Please:
1. Identify the best way to create these test accounts
2. Check if bcrypt password hashing is available in project
3. Either:
   - Create SQL INSERT statements with proper bcrypt hashes, OR
   - Provide a step-by-step guide to create accounts via API + update roles
4. Verify the accounts will be created with correct passwords
5. Provide exact working credentials after creation
6. Test that login works with new accounts

**Success Criteria:**
- ✓ admin@ieltspractice.com can login and access /admin/admin.html
- ✓ ceo@ieltspractice.com can login and access /portalceo.html
- ✓ Credentials work with passwords AdminPass123! and CeoPass123!

