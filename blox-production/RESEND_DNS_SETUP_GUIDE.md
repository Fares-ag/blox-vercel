# Resend DNS Setup Guide for GoDaddy

## Overview

You need to add DNS records to verify your domain and enable email sending. Here's what each record does and how to add them.

---

## Understanding the Records

### 1. Domain Verification (DKIM) - REQUIRED
**Purpose:** Verifies you own the domain and enables DKIM signing (prevents email spoofing)

**Record Type:** TXT  
**Name:** `resend._domainkey`  
**Value:** `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCz599hWTtaYfaM9HR0f4KF05SIJEHLvi7SvHAqFqs6fflWd0po7ZCjwasreM9FzOkAnhrNCLAjFi9UNFVSqjjlMgZdJKc9b0UVKcOV3ErsOop3cX7BCEwBaA4goFVqDuPDOPIo//SDAxhD5pHCHTliJXjWGpgR8cheCNJdUh8o1QIDAQAB`  
**TTL:** Auto (or 3600)

### 2. SPF Record for Sending - REQUIRED
**Purpose:** Authorizes Resend to send emails on your behalf (prevents spam)

**Record Type:** TXT  
**Name:** `send` (or `@` if your provider doesn't support subdomains)  
**Value:** `v=spf1 include:amazonses.com ~all`  
**TTL:** Auto (or 3600)

**Note:** The MX record for "send" is optional - you can skip it if you only need to send emails, not receive them.

### 3. MX Record for Receiving - OPTIONAL
**Purpose:** Allows you to receive emails at your domain (only needed if you want to receive emails)

**Record Type:** MX  
**Name:** `@` (or leave blank for root domain)  
**Value:** `inbound-smtp.eu-west-1.amazonaws.com`  
**Priority:** 0  
**TTL:** Auto (or 3600)

**Note:** You can skip this if you only need to SEND emails (password resets, confirmations, etc.)

---

## Step-by-Step Instructions for GoDaddy

### Step 1: Access DNS Management

1. Log in to your **GoDaddy account**
2. Go to **My Products** → **Domains**
3. Find your domain (e.g., `blox-it.com`)
4. Click **DNS** or **Manage DNS**

### Step 2: Add Domain Verification (DKIM) Record

1. Click **Add** or **+ Add Record**
2. Select **TXT** as the record type
3. Fill in:
   - **Name/Host:** `resend._domainkey`
   - **Value:** `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCz599hWTtaYfaM9HR0f4KF05SIJEHLvi7SvHAqFqs6fflWd0po7ZCjwasreM9FzOkAnhrNCLAjFi9UNFVSqjjlMgZdJKc9b0UVKcOV3ErsOop3cX7BCEwBaA4goFVqDuPDOPIo//SDAxhD5pHCHTliJXjWGpgR8cheCNJdUh8o1QIDAQAB`
   - **TTL:** `3600` (or leave as default)
4. Click **Save**

### Step 3: Add SPF Record for Sending

1. Click **Add** or **+ Add Record**
2. Select **TXT** as the record type
3. Fill in:
   - **Name/Host:** `send` (or `@` if GoDaddy doesn't allow subdomains)
   - **Value:** `v=spf1 include:amazonses.com ~all`
   - **TTL:** `3600` (or leave as default)
4. Click **Save**

**Important:** If GoDaddy doesn't allow "send" as a subdomain, use `@` instead. This will work for the root domain.

### Step 4: (Optional) Add MX Record for Receiving

**Skip this step if you only need to SEND emails (password resets, confirmations).**

If you want to receive emails:

1. Click **Add** or **+ Add Record**
2. Select **MX** as the record type
3. Fill in:
   - **Name/Host:** `@` (or leave blank for root domain)
   - **Value:** `inbound-smtp.eu-west-1.amazonaws.com`
   - **Priority:** `0`
   - **TTL:** `3600` (or leave as default)
4. Click **Save**

---

## What Your DNS Records Should Look Like

After adding, you should have:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCz599hWTtaYfaM9HR0f4KF05SIJEHLvi7SvHAqFqs6fflWd0po7ZCjwasreM9FzOkAnhrNCLAjFi9UNFVSqjjlMgZdJKc9b0UVKcOV3ErsOop3cX7BCEwBaA4goFVqDuPDOPIo//SDAxhD5pHCHTliJXjWGpgR8cheCNJdUh8o1QIDAQAB` | - |
| TXT | `send` (or `@`) | `v=spf1 include:amazonses.com ~all` | - |
| MX | `@` | `inbound-smtp.eu-west-1.amazonaws.com` | 0 |

---

## After Adding DNS Records

### Step 1: Wait for Propagation
- DNS changes can take **15 minutes to 48 hours** to propagate
- Usually takes **1-2 hours** for most providers
- GoDaddy typically propagates within **30-60 minutes**

### Step 2: Verify in Resend Dashboard

1. Go back to **Resend Dashboard**
2. Navigate to **Domains** → Your domain
3. Click **Verify** or **Check Status**
4. Resend will check if the DNS records are properly configured

### Step 3: Check Verification Status

You should see:
- ✅ **Domain Verification**: Verified (green checkmark)
- ✅ **DKIM**: Verified (green checkmark)
- ✅ **SPF**: Verified (green checkmark)
- ⚪ **MX** (if you added it): Verified (green checkmark)

---

## Troubleshooting

### DNS Records Not Showing Up?

1. **Wait longer**: DNS propagation can take up to 48 hours
2. **Check spelling**: Make sure the record name and value are exactly as shown
3. **Check TTL**: Lower TTL values (like 300) can help with faster updates
4. **Clear DNS cache**: Use `ipconfig /flushdns` (Windows) or restart your router

### Verification Failing?

1. **Double-check values**: Copy-paste the exact values from Resend
2. **Check record type**: Make sure TXT records are TXT, not CNAME
3. **Remove old records**: If you have conflicting SPF records, remove them first
4. **Use DNS checker**: Visit https://mxtoolbox.com to verify your DNS records are live

### GoDaddy-Specific Issues

**If "send" subdomain doesn't work:**
- Use `@` instead of `send` for the SPF record
- This will work for the root domain

**If you see "Invalid format" error:**
- Make sure you're using the correct record type (TXT for SPF/DKIM, MX for receiving)
- Check that the value doesn't have extra spaces

---

## Testing Your Setup

Once verified in Resend:

1. **Send a test email** from Resend dashboard
2. **Check Supabase SMTP settings**:
   - Go to Supabase Dashboard → Project Settings → Auth → SMTP Settings
   - Enable Custom SMTP
   - Enter:
     - Host: `smtp.resend.com`
     - Port: `587`
     - Username: `resend`
     - Password: Your Resend API key
     - Sender: `noreply@yourdomain.com` (use your verified domain)

3. **Test password reset**:
   - Go to your app's login page
   - Click "Forgot Password"
   - Enter an email
   - Check if the email arrives

---

## Quick Checklist

- [ ] Added TXT record for `resend._domainkey`
- [ ] Added TXT record for SPF (`send` or `@`)
- [ ] (Optional) Added MX record if receiving emails
- [ ] Waited for DNS propagation (15 min - 2 hours)
- [ ] Verified in Resend dashboard
- [ ] Configured Supabase SMTP settings
- [ ] Tested password reset email

---

## Need Help?

- **Resend Support**: https://resend.com/support
- **GoDaddy DNS Help**: https://www.godaddy.com/help/manage-dns-records-680
- **DNS Checker**: https://mxtoolbox.com (to verify your records are live)

---

**Last Updated:** January 2025

