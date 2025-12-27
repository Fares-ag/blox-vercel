# Email Setup - Quick Reference

## 🔑 Credentials & Settings

### Resend
- **Dashboard**: https://resend.com/dashboard
- **SMTP Host**: `smtp.resend.com`
- **SMTP Port**: `587`
- **Username**: `resend`
- **Password**: [Your Resend API Key]
- **Sender Email**: `info@blox-it.com`
- **Sender Name**: `Resend` or `Blox Support`

### Supabase SMTP Configuration
- **Location**: Project Settings → Auth → SMTP Settings
- **Status**: ✅ Enabled
- **Provider**: Resend

---

## 🔗 Redirect URLs (Supabase)

### Development
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**:
  - `http://localhost:5173/customer/auth/reset-password`
  - `http://localhost:5173/admin/auth/reset-password`
  - `http://localhost:5173/**` (wildcard)

### Production (When Ready)
- **Site URL**: `https://blox-it.com` (or your production domain)
- **Redirect URLs**:
  - `https://blox-it.com/customer/auth/reset-password`
  - `https://blox-it.com/admin/auth/reset-password`
  - `https://blox-it.com/**` (wildcard)

---

## 🧪 Quick Test Commands

### Test Password Reset
1. Go to: `http://localhost:5173/customer/auth/login`
2. Click "Forgot Password"
3. Enter email
4. Check inbox
5. Click reset link
6. Verify redirects to your app (not localhost:3000)

### Test Email Confirmation
1. Create new account
2. Check email
3. Click confirmation link
4. Verify redirects to your app
5. Try logging in

---

## 📊 Monitoring

### Resend Dashboard
- **URL**: https://resend.com/dashboard
- **Check**: Logs, Delivery Stats, Bounce Rates

### Supabase Dashboard
- **URL**: https://supabase.com/dashboard
- **Check**: Authentication → Users, Email Templates

---

## 🚨 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Email not arriving | Check Resend dashboard, spam folder |
| Redirects to localhost:3000 | Update Supabase redirect URLs |
| Reset link doesn't work | Check link expiration, user exists |
| SMTP connection fails | Verify API key, check credentials |

---

## 📝 Next Actions

- [ ] Test all email flows
- [ ] Customize email templates (optional)
- [ ] Add production URLs when ready
- [ ] Monitor delivery rates

---

**Last Updated**: January 2025

