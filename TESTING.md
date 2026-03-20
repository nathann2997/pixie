# End-to-End Testing Guide

This guide walks you through testing the complete Pixie system from Firebase backend to frontend tracking.

## 🎯 What We're Testing

1. **Safety Switch Logic** - Sites with different statuses behave differently
2. **Pixel Loading** - GA4 and Meta pixels load only when status is "active"
3. **Event Tracking** - Click and submit events are tracked correctly
4. **SPA Support** - Dynamically added elements are tracked
5. **Error Handling** - System gracefully handles missing/invalid configs

## 📋 Prerequisites

Make sure you have:
- ✅ Firebase emulators running
- ✅ Test data seeded in Firestore
- ✅ Local web server running for test.html

## 🚀 Step-by-Step Testing

### Step 1: Start Firebase Emulators

```bash
# Terminal 1 - Start emulators
firebase emulators:start
```

**Expected output:**
```
✔  functions[us-central1-getSiteConfig]: http function initialized
✔  All emulators ready!
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://127.0.0.1:4000                │
└─────────────────────────────────────────────────────────────┘

┌───────────┬────────────────┬─────────────────────────────────┐
│ Emulator  │ Host:Port      │ View in Emulator UI             │
├───────────┼────────────────┼─────────────────────────────────┤
│ Functions │ 127.0.0.1:5001 │ http://127.0.0.1:4000/functions │
│ Firestore │ 127.0.0.1:8080 │ http://127.0.0.1:4000/firestore │
└───────────┴────────────────┴─────────────────────────────────┘
```

Keep this terminal running!

### Step 2: Seed Test Data

```bash
# Terminal 2 - Seed database
cd functions
npm run seed
```

**Expected output:**
```
🌱 Starting Firestore seeding...

✅ Queued: client_pending
   Description: Pending site - Script installed but not tracking yet
   Status: pending
   Pixels: ga4
   Events: 0

✅ Queued: client_active
   Description: Active site - Full tracking enabled
   Status: active
   Pixels: ga4, meta
   Events: 4

✅ Queued: client_paused
   Description: Paused site - Temporarily disabled tracking
   Status: paused
   Pixels: ga4, meta
   Events: 1

✨ Database seeding completed successfully!
```

### Step 3: Verify Firestore Data

Open Emulator UI: http://127.0.0.1:4000/firestore

You should see:
- Collection: `sites`
- Documents: `client_pending`, `client_active`, `client_paused`

Click on each document to inspect the data.

### Step 4: Test API Directly

```bash
# Terminal 3 - Test API with cURL

# Test 1: Active site (should return full config)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"

# Test 2: Pending site (should return empty config)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_pending"

# Test 3: Non-existent site (should return 404)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=does-not-exist"

# Test 4: Invalid site ID (should return 400)
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=invalid!!!id"
```

**Expected Results:**

✅ **Test 1** (Active): Returns JSON with pixels and events
✅ **Test 2** (Pending): Returns `{"status":"pending","pixels":{},"events":[]}`
✅ **Test 3** (Not Found): Returns 404 error
✅ **Test 4** (Invalid): Returns 400 error

### Step 5: Start Web Server

```bash
# Terminal 4 - Start local web server
python3 -m http.server 8000
```

### Step 6: Test in Browser

#### Test A: Active Site (Full Tracking)

1. Edit `test.html` line 337 to use `client_active`:
   ```html
   <script src="pixie.js?id=client_active&debug=true"></script>
   ```

2. Open http://localhost:8000/test.html

3. Open DevTools Console (F12)

4. **Expected Console Output:**
   ```
   [Pixie] Script parameters extracted {id: 'client_active', debug: true}
   [Pixie] Fetching configuration for client client_active
   [Pixie] Site status: active - Full tracking enabled
   [Pixie] Loaded (ACTIVE) - Tracking enabled
   [Pixie] Loading ga4 pixel G-TEST-123
   [Pixie] GA4 pixel injected G-TEST-123
   [Pixie] Loading meta pixel 123-TEST
   [Pixie] Meta pixel injected 123-TEST
   [Pixie] Event listeners attached (SPA-compatible)
   [Pixie] Pixie agent fully initialized and ready
   ```

5. **Check Network Tab:**
   - ✅ Should see request to `googletagmanager.com/gtag/js?id=G-TEST-123`
   - ✅ Should see request to `connect.facebook.net/en_US/fbevents.js`

6. **Test Event Tracking:**
   - Click "Purchase" button
   - Console should show: `[Pixie] GA4 event sent { eventName: 'purchase' }`
   - Event monitor should show: `[timestamp] GA4 → purchase`

7. **Test Form Submission:**
   - Submit signup form
   - Console should show: `[Pixie] Meta event sent { eventName: 'Lead' }`
   - Event monitor should show: `[timestamp] Meta → Lead`

8. **Test SPA Support:**
   - Click "Add Dynamic Button"
   - Click the newly added button
   - Console should show event tracking for the dynamic button

#### Test B: Pending Site (No Tracking)

1. Edit `test.html` line 337 to use `client_pending`:
   ```html
   <script src="pixie.js?id=client_pending&debug=true"></script>
   ```

2. Refresh the page (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)

3. **Expected Console Output:**
   ```
   [Pixie] Script parameters extracted {id: 'client_pending', debug: true}
   [Pixie] Fetching configuration for client client_pending
   [Pixie] Site status: pending - Tracking disabled
   [Pixie] Loaded (PENDING) - Script installed but tracking is not active
   [Pixie] No pixels configured
   [Pixie] Event listeners attached (SPA-compatible)
   [Pixie] Pixie agent fully initialized and ready
   ```

4. **Check Network Tab:**
   - ❌ Should NOT see any requests to `googletagmanager.com`
   - ❌ Should NOT see any requests to `facebook.net`

5. **Test Event Tracking:**
   - Click "Purchase" button
   - ❌ No tracking events should fire
   - ✅ Website continues to work normally

#### Test C: Paused Site (Temporarily Disabled)

1. Edit `test.html` to use `client_paused`:
   ```html
   <script src="pixie.js?id=client_paused&debug=true"></script>
   ```

2. Refresh the page

3. **Expected Behavior:**
   - Same as "Pending" - no pixels load, no events tracked
   - Console shows: `[Pixie] Loaded (PAUSED)`

#### Test D: Invalid Site (Error Handling)

1. Edit `test.html` to use a non-existent site:
   ```html
   <script src="pixie.js?id=does-not-exist&debug=true"></script>
   ```

2. Refresh the page

3. **Expected Console Output:**
   ```
   [Pixie] Script parameters extracted {id: 'does-not-exist', debug: true}
   [Pixie] Fetching configuration for client does-not-exist
   [Pixie] Non-critical error in fetchConfig: ...
   [Pixie] Failed to load configuration
   ```

4. **Expected Behavior:**
   - ✅ Website continues to work normally
   - ❌ No pixels load
   - ❌ No tracking occurs

## ✅ Complete Test Checklist

### API Tests
- [ ] Active site returns full config
- [ ] Pending site returns empty config
- [ ] Paused site returns empty config
- [ ] Non-existent site returns 404
- [ ] Invalid site ID returns 400
- [ ] API includes correct cache headers
- [ ] CORS is enabled

### Browser Tests - Active Site
- [ ] Console shows "Loaded (ACTIVE)"
- [ ] GA4 script loads in Network tab
- [ ] Meta Pixel script loads in Network tab
- [ ] Click events are tracked
- [ ] Form submissions are tracked
- [ ] Dynamic elements are tracked (SPA test)
- [ ] Event monitor shows all events

### Browser Tests - Pending/Paused Site
- [ ] Console shows "Loaded (PENDING/PAUSED)"
- [ ] No GA4 script loads
- [ ] No Meta Pixel script loads
- [ ] No events are tracked
- [ ] Website works normally
- [ ] No console errors

### Browser Tests - Invalid Site
- [ ] Error is logged but non-intrusive
- [ ] Website continues to work
- [ ] No tracking occurs
- [ ] No console errors break the page

### Edge Cases
- [ ] Missing site ID parameter (script should exit gracefully)
- [ ] Malformed site ID (should get 400 from API)
- [ ] Network timeout (should fail gracefully)
- [ ] Multiple rapid clicks (events tracked correctly)

## 🐛 Troubleshooting

### "Failed to fetch" Error in Console

**Problem:** Agent can't reach Cloud Function

**Solution:**
1. Check emulators are running: `firebase emulators:start`
2. Verify API URL in `pixie.js` (line 93)
3. Check browser console for exact error message
4. Test API directly with cURL

### No Pixels Loading for Active Site

**Problem:** Site is active but pixels don't load

**Solution:**
1. Check Firestore data in Emulator UI
2. Verify `status` field is exactly `"active"`
3. Check browser console for errors
4. Verify `trackingConfig.pixels` has valid IDs

### Events Not Tracking

**Problem:** Clicks/submits aren't being tracked

**Solution:**
1. Check event selectors match your HTML
2. Open browser DevTools → Elements
3. Find your button/form and verify selector
4. Check console for "Event matched" debug messages

### Seeding Script Fails

**Problem:** `npm run seed` throws error

**Solution:**
1. Ensure emulators are running
2. Check `service-account.json` exists (or use default credentials)
3. Try: `cd functions && rm -rf node_modules && npm install`

## 📊 Success Criteria

You've successfully tested Pixie when:

✅ Active sites track events
✅ Pending/paused sites don't track but don't break
✅ Invalid configurations are handled gracefully
✅ SPA dynamic elements are tracked
✅ Website functionality is never affected
✅ API returns correct status codes
✅ Cache headers are present
✅ CORS works from any origin

## 🎉 Next Steps

Once all tests pass:

1. **Production Setup**: Follow `FIREBASE_SETUP.md` to deploy to production
2. **Update API URL**: Change `pixie.js` to use production Cloud Function URL
3. **Minify Script**: Run `npm run build` to create `pixie.min.js`
4. **Deploy to CDN**: Upload minified script to CDN
5. **Create Admin UI**: Build interface for managing site configurations

---

**Happy Testing! 🚀**
