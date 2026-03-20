# ⚡ Pixie Quick Start Guide

Get Pixie up and running in 5 minutes!

## 🎯 Prerequisites

- Node.js 18+ installed
- Firebase CLI: `npm install -g firebase-tools`
- Python 3 (for local web server)

## 🚀 5-Minute Setup

### 1. Install Firebase CLI & Login

```bash
npm install -g firebase-tools
firebase login
```

### 2. Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Start Firebase Emulators

```bash
firebase emulators:start
```

Keep this terminal running! You should see:
```
✔  All emulators ready!
Functions: http://127.0.0.1:5001
Firestore:  http://127.0.0.1:8080
Emulator UI: http://127.0.0.1:4000
```

### 4. Seed Test Data (New Terminal)

```bash
cd functions
npm run seed
```

You should see:
```
✨ Database seeding completed successfully!
```

### 5. Start Web Server (New Terminal)

```bash
python3 -m http.server 8000
```

### 6. Open Test Page

Open your browser to: **http://localhost:8000/test-switcher.html**

## 🎮 Try It Out!

### Test Active Site (Full Tracking)

1. Click **"Load This Test"** under "Active Site"
2. Page reloads with Pixie loaded
3. Open DevTools Console (F12)
4. Look for green `[Pixie]` messages
5. Click the test buttons and see events tracked!

**Expected Console Output:**
```
[Pixie] Loaded (ACTIVE) - Tracking enabled
[Pixie] GA4 pixel injected G-TEST-123
[Pixie] Meta pixel injected 123-TEST
[Pixie] Pixie agent fully initialized and ready
```

### Test Pending Site (No Tracking)

1. Click **"Load This Test"** under "Pending Site"
2. Page reloads
3. Check DevTools Console

**Expected Console Output:**
```
[Pixie] Loaded (PENDING) - Script installed but tracking is not active
[Pixie] No pixels configured
```

Notice: No GA4 or Meta scripts load, but the website works perfectly!

## 📊 View Firestore Data

Open the Firebase Emulator UI: **http://127.0.0.1:4000/firestore**

You'll see the `sites` collection with three test documents:
- `client_active` - Full tracking
- `client_pending` - No tracking (pending)
- `client_paused` - No tracking (paused)

## 🧪 Test API Directly

```bash
# Active site (returns full config)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"

# Pending site (returns empty config)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_pending"
```

## 📁 Project Structure

```
pixie/
├── pixie.js                  # Main tracking script (frontend)
├── test.html                 # Basic test page
├── test-switcher.html        # Interactive test page with switcher
├── functions/
│   ├── src/
│   │   └── index.ts          # Cloud Function (backend)
│   └── scripts/
│       └── seed-db.ts        # Database seeding script
├── firebase.json             # Firebase configuration
├── QUICKSTART.md            # This file
├── TESTING.md               # Detailed testing guide
└── FIREBASE_SETUP.md        # Production deployment guide
```

## 🎓 What's Happening?

1. **Firebase Cloud Function** (`getSiteConfig`) serves configuration
2. **Firestore** stores site configurations with status (pending/active/paused)
3. **pixie.js** loads on the website and:
   - Fetches config from Cloud Function
   - Checks status (safety switch)
   - Only loads pixels if status is "active"
   - Tracks events based on configuration

## 🔄 Switching Between Sites

Use the **test-switcher.html** page to easily test different scenarios:

- **Active** → Full tracking enabled
- **Pending** → Script installed, no tracking yet
- **Paused** → Tracking temporarily disabled
- **Invalid** → Non-existent site (error handling)

## 🐛 Troubleshooting

### "Failed to fetch" error

**Problem:** Agent can't reach Cloud Function

**Solution:**
- Check emulators are running: `firebase emulators:start`
- Verify you see "All emulators ready!" message

### No pixels loading

**Problem:** Site is active but pixels don't appear

**Solution:**
- Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- Check console for error messages
- Verify Firestore data: http://127.0.0.1:4000/firestore

### Seeding fails

**Problem:** `npm run seed` throws error

**Solution:**
- Ensure emulators are running first
- Try: `cd functions && npm install` then `npm run seed`

## 📚 Next Steps

### For Testing
- Read **TESTING.md** for comprehensive test scenarios
- Try the SPA dynamic element test
- Test form submissions and click events

### For Production
- Read **FIREBASE_SETUP.md** for deployment guide
- Update API URL in `pixie.js` to production
- Deploy Cloud Functions: `firebase deploy --only functions`

### For Development
- Read **API.md** for backend API details
- Read **README.md** for architecture details
- Explore `functions/src/index.ts` for Cloud Function code

## 🎉 Success Criteria

You're all set when you see:

✅ Emulators running without errors
✅ Test data seeded successfully
✅ Test switcher page loads
✅ Active site shows "Loaded (ACTIVE)" in console
✅ Pending site shows "Loaded (PENDING)" in console
✅ GA4 and Meta scripts load for active sites
✅ No scripts load for pending/paused sites
✅ Events tracked and shown in event log

## 💡 Pro Tips

1. **Keep Emulators Running**: Don't stop the emulator terminal - it needs to stay active
2. **Use Debug Mode**: Always use `?debug=true` during development
3. **Check Network Tab**: See exactly which scripts are loading
4. **Use Test Switcher**: Easier than manually editing HTML
5. **Clear Cache**: Use hard refresh when switching sites

## 🆘 Getting Help

If you get stuck:

1. Check the terminal running emulators for errors
2. Check browser console for error messages
3. Review TESTING.md for detailed troubleshooting
4. Verify all prerequisites are installed
5. Try stopping and restarting emulators

## 📞 Quick Commands Reference

```bash
# Start emulators
firebase emulators:start

# Seed database
cd functions && npm run seed

# Clear test data
cd functions && npm run seed clear

# Start web server
python3 -m http.server 8000

# Test API
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"
```

---

**That's it! You're ready to start building with Pixie. 🚀**

For detailed information, check out:
- **TESTING.md** - Comprehensive testing guide
- **FIREBASE_SETUP.md** - Production deployment
- **API.md** - Backend API documentation
- **README.md** - Full project documentation
