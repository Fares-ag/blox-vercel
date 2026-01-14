# SkipCash Test Cards - Quick Reference

## ✅ Successful Payment Test Cards

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| **MasterCard** | `5200 0000 0000 2151` | `10/2028` | `237` |
| **Visa** | `4000 0000 0000 2503` | `10/2028` | `442` |
| **MasterCard (Non-3DS)** | `5200 0000 0000 0007` | `04/26` | `256` |

## ❌ Failed Payment Test Cards

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| **MasterCard** | `5200 0000 0000 2490` | `04/2028` | `256` |
| **Visa** | `4000 0000 0000 2370` | `06/2028` | `256` |

## 💳 Test Debit Card (NAPS/QPAY - Qatar)

| Card Number | Expiry | OTP | CVV |
|-------------|--------|-----|-----|
| `4215 3755 0088 3243` | `06/2026` | `123456` | `123` |

---

## 🚀 Quick Test Instructions

1. **Ensure Sandbox Mode**: Verify `SKIPCASH_USE_SANDBOX=true` in Supabase secrets

2. **Use Unique Contact Info**: Each transaction requires unique phone/email
   - Format: `test+{timestamp}@example.com`
   - Phone: `+974{random}`

3. **Test Successful Payment**:
   - Use: **MasterCard `5200 0000 0000 2151`** or **Visa `4000 0000 0000 2503`**
   - Expiry: `10/2028`
   - CVV: `237` (MasterCard) or `442` (Visa)

4. **Test Failed Payment**:
   - Use: **MasterCard `5200 0000 0000 2490`** or **Visa `4000 0000 0000 2370`**
   - Should show payment declined

5. **Test QPAY/Debit**:
   - Card: `4215 3755 0088 3243`
   - Expiry: `06/2026`
   - CVV: `123`
   - OTP: `123456` (when prompted)

---

## 📝 Notes

- ✅ These cards **only work in Sandbox/Test mode**
- ✅ Each transaction requires **unique phone number and email**
- ✅ Test cards simulate various payment scenarios
- ✅ Use to verify integration handles success and failure correctly

---

**Last Updated**: January 2025  
**Payment Gateway**: SkipCash  
**Environment**: Development/Testing
