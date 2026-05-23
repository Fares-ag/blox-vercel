# Email Service Alternatives for Supabase Authentication

## Overview

This document compares email service providers that can be used with Supabase for transactional emails (password resets, email confirmations, etc.).

---

## Quick Comparison Table

| Service | Free Tier | Paid Starting | Best For | Setup Difficulty |
|---------|-----------|---------------|----------|------------------|
| **Resend** | 3,000/month | $20/month | Modern apps, React | ⭐ Easy |
| **Mailgun** | 5,000/month (3mo) | $35/month | High volume | ⭐⭐ Medium |
| **Postmark** | None | $15/month | Critical emails | ⭐ Easy |
| **AWS SES** | 62,000/month* | $0.10/1K | High volume, AWS users | ⭐⭐⭐ Complex |
| **Brevo** | 300/day | €25/month | Budget-conscious | ⭐⭐ Medium |
| **Mailjet** | 6,000/month | $15/month | Startups | ⭐⭐ Medium |
| **MailerSend** | 12,000/month | $10/month | Cost-effective | ⭐ Easy |

*AWS SES free tier: 62,000 emails/month when sending from EC2

---

## Detailed Comparison

### 1. Resend ⭐ RECOMMENDED FOR MODERN APPS

**Why Choose Resend:**
- Modern, developer-friendly API
- Excellent deliverability
- Built-in React Email support
- Simple setup process
- Great documentation

**Pricing:**
- Free: 3,000 emails/month
- Pro: $20/month for 50,000 emails
- Scale: Custom pricing

**Setup Steps:**
1. Sign up at https://resend.com
2. Verify your domain
3. Create API key
4. Configure in Supabase:
   - SMTP Host: `smtp.resend.com`
   - SMTP Port: `587` or `465`
   - Username: `resend`
   - Password: Your API key
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Modern API design
✅ Excellent deliverability
✅ Free tier is generous
✅ React Email integration
✅ Simple setup

**Cons:**
❌ Newer service (less established)
❌ Smaller community

---

### 2. Mailgun

**Why Choose Mailgun:**
- Industry leader in deliverability
- Detailed analytics
- Flexible APIs
- Great for high-volume sending

**Pricing:**
- Free: 5,000 emails/month (first 3 months)
- Foundation: $35/month for 50,000 emails
- Growth: $80/month for 100,000 emails

**Setup Steps:**
1. Sign up at https://www.mailgun.com
2. Verify domain (add DNS records)
3. Get SMTP credentials
4. Configure in Supabase:
   - SMTP Host: `smtp.mailgun.org`
   - SMTP Port: `587`
   - Username: Your Mailgun username
   - Password: Your Mailgun password
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Excellent deliverability
✅ Detailed analytics
✅ Flexible APIs
✅ Good documentation

**Cons:**
❌ Setup can be complex
❌ Pricing scales up quickly
❌ Free tier limited to 3 months

---

### 3. Postmark ⭐ BEST FOR CRITICAL EMAILS

**Why Choose Postmark:**
- Highest deliverability rates
- Fast email delivery
- Excellent customer support
- Simple, focused API

**Pricing:**
- No free tier
- Starter: $15/month for 10,000 emails
- Pro: $80/month for 100,000 emails

**Setup Steps:**
1. Sign up at https://postmarkapp.com
2. Verify domain
3. Get SMTP credentials
4. Configure in Supabase:
   - SMTP Host: `smtp.postmarkapp.com`
   - SMTP Port: `587`
   - Username: Your Postmark server token
   - Password: Your Postmark server token
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Highest deliverability
✅ Fast delivery
✅ Excellent support
✅ Simple API
✅ Focused on transactional emails

**Cons:**
❌ No free tier
❌ More expensive than alternatives
❌ Transactional emails only

---

### 4. AWS SES ⭐ BEST FOR HIGH VOLUME / COST-SENSITIVE

**Why Choose AWS SES:**
- Extremely low cost
- Highly scalable
- Reliable infrastructure
- Integrates with AWS services

**Pricing:**
- Free: 62,000 emails/month (when sending from EC2)
- Paid: $0.10 per 1,000 emails
- Very cost-effective for high volume

**Setup Steps:**
1. Create AWS account
2. Verify domain in SES
3. Request production access (move out of sandbox)
4. Create SMTP credentials
5. Configure in Supabase:
   - SMTP Host: `email-smtp.[region].amazonaws.com`
   - SMTP Port: `587`
   - Username: Your SMTP username
   - Password: Your SMTP password
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Very low cost
✅ Highly scalable
✅ Reliable
✅ Integrates with AWS

**Cons:**
❌ Complex setup
❌ Requires AWS account
❌ Less user-friendly
❌ Sandbox mode initially

---

### 5. Brevo (formerly Sendinblue)

**Why Choose Brevo:**
- Generous free tier
- Good deliverability
- Marketing + transactional emails
- Affordable pricing

**Pricing:**
- Free: 300 emails/day
- Lite: €25/month for 20,000 emails/month
- Premium: €65/month for 100,000 emails/month

**Setup Steps:**
1. Sign up at https://www.brevo.com
2. Verify domain
3. Get SMTP credentials
4. Configure in Supabase:
   - SMTP Host: `smtp-relay.brevo.com`
   - SMTP Port: `587`
   - Username: Your Brevo SMTP username
   - Password: Your Brevo SMTP password
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Generous free tier
✅ Good deliverability
✅ Marketing + transactional
✅ Affordable

**Cons:**
❌ Free tier limited (300/day)
❌ Can be slower than specialized services
❌ Interface can be overwhelming

---

### 6. Mailjet

**Why Choose Mailjet:**
- Good free tier
- Marketing + transactional
- Good deliverability
- Affordable

**Pricing:**
- Free: 6,000 emails/month
- Essential: $15/month for 15,000 emails
- Premium: $25/month for 50,000 emails

**Setup Steps:**
1. Sign up at https://www.mailjet.com
2. Verify domain
3. Get SMTP credentials
4. Configure in Supabase:
   - SMTP Host: `in-v3.mailjet.com`
   - SMTP Port: `587`
   - Username: Your Mailjet API key
   - Password: Your Mailjet secret key
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Good free tier
✅ Marketing + transactional
✅ Good deliverability
✅ Affordable

**Cons:**
❌ Interface can be complex
❌ Less specialized than Postmark/Resend

---

### 7. MailerSend

**Why Choose MailerSend:**
- Generous free tier
- Good deliverability
- Competitive pricing
- Simple API

**Pricing:**
- Free: 12,000 emails/month
- Flex: $10/month for 50,000 emails
- Pro: $20/month for 100,000 emails

**Setup Steps:**
1. Sign up at https://www.mailersend.com
2. Verify domain
3. Get SMTP credentials
4. Configure in Supabase:
   - SMTP Host: `smtp.mailersend.com`
   - SMTP Port: `587`
   - Username: Your MailerSend token ID
   - Password: Your MailerSend token
   - Sender: `noreply@yourdomain.com`

**Pros:**
✅ Generous free tier
✅ Good deliverability
✅ Competitive pricing
✅ Simple API

**Cons:**
❌ Smaller brand recognition
❌ Less established than competitors

---

## Recommendations by Use Case

### 🔐 Authentication Emails Only (Password Reset, Email Confirmation, Sign Up)
**Best Choice:** **Resend** or **Postmark**
- Focused on transactional emails
- Excellent deliverability for auth emails
- Easy setup
- Reliable delivery

**Why these are perfect:**
- ✅ Designed specifically for transactional emails
- ✅ Fast delivery (critical for password resets)
- ✅ High deliverability (emails reach inbox, not spam)
- ✅ Simple API/SMTP setup
- ✅ Good free/affordable tiers for low volume

### 🚀 Starting Out / Low Volume
**Best Choice:** **Resend** or **MailerSend**
- Generous free tiers
- Easy setup
- Good for testing

### 💰 Budget-Conscious
**Best Choice:** **AWS SES** or **MailerSend**
- Lowest cost per email
- Good free tiers

### 🎯 Critical Transactional Emails
**Best Choice:** **Postmark**
- Highest deliverability
- Fast delivery
- Excellent support

### 📈 High Volume
**Best Choice:** **AWS SES** or **Mailgun**
- Best scalability
- Cost-effective at scale

### ⚡ Quick Setup / Modern Stack
**Best Choice:** **Resend**
- Developer-friendly
- Modern API
- React Email support

---

## Supabase Configuration (Generic)

For any SMTP provider, configure in Supabase Dashboard:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Enter your SMTP credentials:
   - **Host**: Provider's SMTP host
   - **Port**: Usually `587` (STARTTLS) or `465` (SSL)
   - **Username**: Your SMTP username/API key
   - **Password**: Your SMTP password/API key
   - **Sender Email**: `noreply@yourdomain.com` (must be verified)
   - **Sender Name**: `Blox Support` (or your brand name)

4. Test the connection
5. Save settings

---

## Domain Verification

Most providers require domain verification. Common steps:

1. Add DNS records (usually TXT or CNAME)
2. Wait for verification (can take up to 48 hours)
3. Verify in provider dashboard
4. Start sending emails

---

## Testing Your Setup

After configuring:

1. **Test Password Reset:**
   - Go to login page
   - Click "Forgot Password"
   - Enter email
   - Check inbox for reset email

2. **Test Email Confirmation:**
   - Create new account
   - Check inbox for confirmation email
   - Click confirmation link

3. **Check Email Delivery:**
   - Verify email arrives in inbox (not spam)
   - Check email formatting
   - Test on multiple email providers (Gmail, Outlook, etc.)

---

## Migration Guide

If switching from one provider to another:

1. **Set up new provider** (verify domain, get credentials)
2. **Configure in Supabase** (update SMTP settings)
3. **Test thoroughly** (send test emails)
4. **Monitor delivery** (check spam rates, delivery times)
5. **Update DNS** (if needed, remove old provider records)

---

## Support & Resources

- **Resend**: https://resend.com/docs
- **Mailgun**: https://documentation.mailgun.com
- **Postmark**: https://postmarkapp.com/support
- **AWS SES**: https://docs.aws.amazon.com/ses
- **Brevo**: https://developers.brevo.com
- **Mailjet**: https://dev.mailjet.com
- **MailerSend**: https://developers.mailersend.com

---

## Final Recommendation

For **Blox Platform** (Authentication emails only: password reset, email confirmation, sign up), I recommend:

### 🥇 **Primary Choice: Resend**
**Perfect for authentication emails:**
- ✅ **Free tier**: 3,000 emails/month (plenty for auth emails)
- ✅ **Fast delivery**: Critical for password resets
- ✅ **High deliverability**: Emails reach inbox
- ✅ **Easy setup**: Simple SMTP configuration
- ✅ **Modern API**: Developer-friendly
- ✅ **Reliable**: Built for transactional emails

**Estimated monthly cost:** $0 (free tier covers typical auth email volume)

### 🥈 **Alternative: Postmark**
**If you want the absolute best deliverability:**
- ✅ **Highest deliverability**: Best in class
- ✅ **Fast delivery**: Sub-second delivery
- ✅ **Excellent support**: Great customer service
- ⚠️ **No free tier**: $15/month minimum
- ⚠️ **More expensive**: But worth it for critical emails

**Estimated monthly cost:** $15/month (10,000 emails)

### 🥉 **Budget Option: MailerSend**
**If you want a free tier with good features:**
- ✅ **Generous free tier**: 12,000 emails/month
- ✅ **Good deliverability**: Reliable delivery
- ✅ **Affordable**: $10/month if you exceed free tier
- ⚠️ **Less established**: Smaller brand than Resend/Postmark

**Estimated monthly cost:** $0 (free tier) or $10/month

### 💡 **Why NOT these for auth emails:**
- **Brevo/Mailjet**: Include marketing features you don't need
- **Mailgun**: More complex setup, better for high volume
- **AWS SES**: More complex setup, overkill for low volume auth emails

---

## Volume Estimate for Auth Emails

Typical monthly volume for authentication emails:
- **New signups**: ~100-500 users/month = 100-500 emails
- **Password resets**: ~50-200/month = 50-200 emails
- **Email confirmations**: ~100-500/month = 100-500 emails
- **Total**: ~250-1,200 emails/month

**Conclusion:** Free tier of Resend (3,000/month) or MailerSend (12,000/month) is more than sufficient!

---

**Last Updated:** January 2025

