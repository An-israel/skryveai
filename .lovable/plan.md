
## Priority Order

### 🔴 Critical (Blocking revenue/core features)
1. **Fix payment gateway** — Paystack subscription payments not processing
2. **Fix AutoPilot stuck on IDLE** — Not running/sending on any accounts
3. **Stop daily credits after trial ends** — Users getting free credits indefinitely prevents upgrades

### 🟡 Important (User experience)
4. **Update referral page** — Show 40% commission for 6 months clearly
5. **Fix active/inactive user tracking** — Activity within 24h = active, no activity for 48h = inactive
6. **Fix email open tracking** — Admin showing emails not opened when they were
7. **AutoPilot preview** — Let users see what will be sent before it goes out

### 🟢 Informational
8. **Team plan explanation** — Explain how team email sending works
9. **Email scraping quality** — Ongoing issue with finding correct emails

### Approach
- I'll tackle items 1-7 with code changes
- Items 8-9 I'll explain in detail
- Will batch related changes together for efficiency
