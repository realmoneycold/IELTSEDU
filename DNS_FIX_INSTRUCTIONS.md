# DNS Fix Required - Website Down

## Problem
Your domain `ieltspractice.net` is resolving to the wrong IP address:
- Current DNS: `198.54.117.242` ❌
- Correct IP: `178.105.159.199` ✅ (Hetzner CPX22 - Falkenstein)

## Solution
Update your DNS A record at your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.):

1. Log in to your domain registrar
2. Go to DNS management / DNS settings
3. Find the A record for `@` (root domain) or `ieltspractice.net`
4. Change the IP to `178.105.159.199`
5. Save changes

## Verification
After updating DNS, verify with:
```bash
nslookup ieltspractice.net
# Should show: 178.105.159.199
```

DNS propagation takes 5-60 minutes.

## Server Status ✅
- Nginx: Running
- Node.js Backend: Running on port 4000
- Firewall: Ports 80, 443 allowed
- All services healthy

The server is ready - just needs correct DNS pointing!
