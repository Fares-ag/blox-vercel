# Fix ERR_NAME_NOT_RESOLVED Supabase Error

## Problem
You're seeing `ERR_NAME_NOT_RESOLVED` errors when trying to access Supabase:
```
zqwsxewuppexvjyakuqf.supabase.co: Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

## Root Cause
Your DNS resolver is redirecting `*.supabase.co` to `*.supabase.co.q-auto.com`, which is not a valid Supabase domain. This is causing the browser to fail when resolving the domain.

**DNS Resolution Test Results:**
```
zqwsxewuppexvjyakuqf.supabase.co → zqwsxewuppexvjyakuqf.supabase.co.q-auto.com (WRONG!)
```

## Solutions

### Solution 1: Change DNS Server (Recommended)
Use a public DNS server that doesn't modify domain names:

**Windows:**
1. Open **Control Panel** → **Network and Sharing Center**
2. Click on your active network connection
3. Click **Properties**
4. Select **Internet Protocol Version 4 (TCP/IPv4)** and click **Properties**
5. Select **Use the following DNS server addresses:**
   - Preferred: `8.8.8.8` (Google DNS)
   - Alternate: `8.8.4.4` (Google DNS) or `1.1.1.1` (Cloudflare)
6. Click **OK** and restart your browser

**Or via Command Prompt (Admin):**
```cmd
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2
```

### Solution 2: Fix Corporate Network DNS
If you're on a corporate network (`q-auto.com`):

1. Contact your IT department to:
   - Add `*.supabase.co` to DNS exclusions/whitelist
   - Or configure DNS to not append `.q-auto.com` suffix for external domains

2. If you have admin access, edit DNS settings to exclude `.supabase.co` from suffix appending

### Solution 3: Use Hosts File (Temporary Workaround)
Add the Supabase IP directly to your hosts file:

1. Get the correct IP for your Supabase project from Supabase Dashboard → Settings → API
2. Edit `C:\Windows\System32\drivers\etc\hosts` (as Administrator)
3. Add this line (replace with actual IP from Supabase dashboard):
```
[SUPABASE_IP_ADDRESS] zqwsxewuppexvjyakuqf.supabase.co
```

**Note:** This is not recommended for production, only for testing.

### Solution 4: Use VPN or Different Network
- Connect to a different network (mobile hotspot, different WiFi)
- Use a VPN that doesn't modify DNS

## Verify Fix

After applying a solution, verify the DNS resolution:

```powershell
nslookup zqwsxewuppexvjyakuqf.supabase.co
```

**Expected result:**
```
Name:    zqwsxewuppexvjyakuqf.supabase.co
Address: [Some IP address starting with 13. or similar]
```

**Wrong result (current issue):**
```
Name:    zqwsxewuppexvjyakuqf.supabase.co.q-auto.com  ❌
```

## Test Connection

1. Restart your browser completely
2. Open browser console (F12)
3. Try accessing your application
4. Check Network tab for Supabase requests - they should now succeed

## Additional Notes

- **Environment variables are correct** ✅ - No need to change them
- **Code is correct** ✅ - This is purely a DNS/network issue
- **Supabase project is likely active** ✅ - The issue is DNS resolution, not the project

## Still Having Issues?

1. Check if Supabase project is paused:
   - Go to https://supabase.com/dashboard
   - Verify project `zqwsxewuppexvjyakuqf` exists and is active

2. Test direct access:
   - Try opening: https://zqwsxewuppexvjyakuqf.supabase.co in your browser
   - If it redirects to a search page or shows error, DNS is still broken

3. Contact IT Support:
   - Provide this document to your IT department
   - Ask them to whitelist `*.supabase.co` domains

