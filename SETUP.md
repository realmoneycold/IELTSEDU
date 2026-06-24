# IELTS Practice — Email & OAuth Setup Guide

## Current Status

Your app is deployed on Render. Two services need environment variables configured:

1. **Email (Resend)** — needed for verification codes, password reset, welcome emails
2. **Google OAuth** — needed for "Sign in with Google"

---

## 1. Fix Email Verification (Resend)

### Problem
Verification codes are generated and stored in the database, but emails are NOT being sent because `RESEND_API_KEY` is missing or invalid. The app is running in "demo mode" — it logs emails to the console instead of sending them.

### Solution

**Step 1: Get a Resend API Key**
1. Go to https://resend.com and sign up (free tier: 3,000 emails/day)
2. Verify your domain: `ieltspractice.net`
3. Go to **API Keys** → Create an API key
4. Copy the key (starts with `re_`)

**Step 2: Add to Render Environment Variables**
1. Go to https://dashboard.render.com
2. Select your **IELTS Practice** web service
3. Go to **Environment** tab
4. Add:
   - `RESEND_API_KEY` = your copied key (e.g. `re_aBcDeFgHiJkLmNoPqRsTuVwXyZ`)
   - `EMAIL_FROM` = `IELTS Practice <noreply@ieltspractice.net>`
5. Click **Save Changes** — Render will redeploy automatically

**Step 3: Verify**
After redeploy, visit: `https://ieltspractice.net/api/v1/auth/health`

You should see:
```json
{
  "services": {
    "email": {
      "configured": true,
      "reason": "OK"
    }
  }
}
```

**Step 4: Test Signup**
Try signing up again. The verification code email should arrive within seconds.

---

## 2. Fix Google OAuth Login

### Problem
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set in your Render environment. When users click the Google button, they get: *"Google login is not configured on this server"*

### Solution

**Step 1: Create Google OAuth Credentials**
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Name: `IELTS Practice Web`
7. **Authorized redirect URIs** — ADD exactly this:
   ```
   https://ieltspractice.net/api/v1/auth/oauth/google/callback
   ```
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

**Step 2: Add to Render Environment Variables**
1. In Render dashboard → **Environment** tab
2. Add:
   - `GOOGLE_CLIENT_ID` = your client ID (ends with `.apps.googleusercontent.com`)
   - `GOOGLE_CLIENT_SECRET` = your client secret
3. Click **Save Changes**

**Step 3: Verify**
After redeploy, visit: `https://ieltspractice.net/api/v1/auth/health`

You should see:
```json
{
  "services": {
    "google_oauth": {
      "configured": true,
      "missing": []
    }
  }
}
```

**Step 4: Test**
Click the Google login button. It should now redirect to Google's sign-in page.

---

## Temporary Workaround (Until Email is Fixed)

If you need to test signup **before** configuring Resend, you can retrieve verification codes manually:

### Option A: Admin API Endpoint (Requires Admin JWT)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  https://ieltspractice.net/api/v1/auth/admin/verification-codes
```

### Option B: Check Server Logs
In Render dashboard → **Logs** tab, look for lines like:
```
>>> VERIFICATION CODE: 123456 <<<
```

**⚠️ Security Warning:** These workarounds are for testing only. Do not use in production.

---

## Summary of Required Environment Variables

| Variable | Where to Get | Purpose |
|----------|-------------|---------|
| `RESEND_API_KEY` | https://resend.com/api-keys | Send emails |
| `EMAIL_FROM` | Your domain | Sender address |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Google OAuth |

All other variables (`DATABASE_URL`, `JWT_SECRET`, etc.) should already be configured.
