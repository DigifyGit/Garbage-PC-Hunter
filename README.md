# 🗑️ Garbage PC Hunter

Automated daily hunter for used laptops on OLX Portugal and Facebook Marketplace near Lisbon. Uses Playwright headless browser + Firebase Functions + Junkyard Master scoring engine. Sends a daily Telegram report at 09:00 Lisbon time.

**Hard rules:** No fake scraping. No simulated browsing. If blocked, stop and report. Every listing is junk until proven otherwise.

---

## Deploy Checklist

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Set your Firebase project ID in .firebaserc, then:
firebase use --add

# 4. Install function dependencies
cd functions && npm install

# 5. Set Telegram secrets
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID

# 6. Deploy
firebase deploy --only functions,firestore
```

---

## Facebook Auth Setup

Facebook requires a saved login session. Run this once locally:

```bash
cd functions
npx playwright codegen https://www.facebook.com
```

Log in manually in the browser that opens. Then save the session:

```js
await context.storageState({ path: 'facebook-auth.json' });
```

Upload `facebook-auth.json` to Firebase Storage and reference it in the function.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `runs` | One doc per daily run — status, duration, platform results |
| `listings` | One doc per scraped listing with full scoring |
| `keywords` | Keyword performance tracking |

---

## Junkyard Master Classification Tiers

1. **TRASH** — avoid
2. **JUNK** — minimal paper specs only
3. **HARD_COMPROMISE** — usable only if forced
4. **SURVIVAL_FALLBACK** — temporarily unblocks work
5. **LESS_BAD** — less harmful than average
6. **RARE_VALUE** — unusually favorable, worth serious look
7. **BENCHMARK_OUTLIER** — true market anomaly, extremely rare

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat/channel ID |
