# Firebase Backend Setup Guide

This guide will help you set up the Firebase backend for Pixie, including Cloud Functions and Firestore.

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- A Firebase project (or create one at https://console.firebase.google.com)

## 🚀 Quick Start

### 1. Firebase Project Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
# Select Firestore and Functions
firebase init

# Or update .firebaserc with your project ID
# Edit .firebaserc and replace "pixie-dev" with your project ID
```

### 2. Install Dependencies

```bash
cd functions
npm install
```

### 3. Configure Firestore

Create Firestore database in your Firebase Console:
1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location

### 4. Get Service Account Key (For Seeding)

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `functions/service-account.json`
4. **IMPORTANT**: Add this to `.gitignore` (already done)

Alternative: Use Firebase Auth in Cloud Shell or CI/CD:
```bash
# Set default credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### 5. Start Firebase Emulators

```bash
# From project root
firebase emulators:start
```

This will start:
- **Functions Emulator**: http://127.0.0.1:5001
- **Firestore Emulator**: http://127.0.0.1:8080
- **Emulator UI**: http://127.0.0.1:4000

### 6. Seed Test Data

In a new terminal:

```bash
cd functions
npm run seed
```

This creates three test sites in Firestore:
- `client_pending` - Status: pending (no tracking)
- `client_active` - Status: active (full tracking)
- `client_paused` - Status: paused (temporarily disabled)

## 🧪 Testing the API

### Test with cURL

**Test Active Site:**
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"
```

Expected response:
```json
{
  "status": "active",
  "pixels": {
    "ga4": "G-TEST-123",
    "meta": "123-TEST"
  },
  "events": [...]
}
```

**Test Pending Site:**
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_pending"
```

Expected response:
```json
{
  "status": "pending",
  "pixels": {},
  "events": []
}
```

**Test Non-existent Site:**
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=does-not-exist"
```

Expected response (404):
```json
{
  "error": "Site not found",
  "message": "No configuration found for site ID: does-not-exist"
}
```

### Test with Browser

1. Keep emulators running
2. Update `pixie.js` API_URL (line 93) to point to your emulator:
   ```javascript
   const API_URL = 'http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig';
   ```
3. Update `test.html` script tag to test different sites:
   ```html
   <!-- Test active site -->
   <script src="pixie.js?id=client_active&debug=true"></script>
   
   <!-- Test pending site -->
   <script src="pixie.js?id=client_pending&debug=true"></script>
   ```
4. Open http://localhost:8000/test.html
5. Check browser console for `[Pixie]` messages

## 🔍 Expected Behavior

### Active Site (`client_active`)
- ✅ Console: `[Pixie] Loaded (ACTIVE) - Tracking enabled`
- ✅ GA4 script loads in Network tab
- ✅ Meta Pixel script loads in Network tab
- ✅ Click events are tracked
- ✅ Form submissions are tracked

### Pending Site (`client_pending`)
- ✅ Console: `[Pixie] Loaded (PENDING) - Script installed but tracking is not active`
- ❌ No GA4 script loads
- ❌ No Meta Pixel script loads
- ❌ No events are tracked
- ✅ Website continues to work normally

### Paused Site (`client_paused`)
- ✅ Console: `[Pixie] Loaded (PAUSED) - Script installed but tracking is not active`
- ❌ No pixels load
- ❌ No events are tracked

## 📊 Firestore Data Structure

### Collection: `sites`

```typescript
{
  // Document ID: unique site identifier
  "client_active": {
    owner_id: string,           // User who owns this site
    url: string,                // Site URL
    status: "pending" | "active" | "paused",  // Safety switch
    trackingConfig: {
      pixels: {
        ga4?: string,           // GA4 Measurement ID
        meta?: string           // Meta Pixel ID
      },
      events: [
        {
          selector: string,     // CSS selector
          trigger: "click" | "submit",
          platform: "ga4" | "meta",
          event_name: string,
          event_data?: object   // Optional event parameters
        }
      ]
    },
    created_at: Timestamp,
    updated_at: Timestamp
  }
}
```

## 🚢 Deployment to Production

### 1. Update Firebase Project

```bash
# Set production project
firebase use production

# Or add a new project alias
firebase use --add
```

### 2. Update pixie.js API URL

```javascript
// In pixie.js, line ~93
const API_URL = 'https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/getSiteConfig';
```

### 3. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:getSiteConfig
```

### 4. Set up Firestore Security Rules

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sites collection - only authenticated admin users can write
    match /sites/{siteId} {
      allow read: if true;  // Public reads (for Cloud Function)
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### 5. Seed Production Data

**Option A:** Use Firebase Console
- Manually create site documents in Firestore

**Option B:** Use seeding script with production credentials
```bash
# Set production credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/production-service-account.json"

# Run seed script
cd functions
npm run seed
```

## 🔧 Development Commands

```bash
# Install dependencies
cd functions && npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild)
npm run build:watch

# Start emulators
firebase emulators:start

# Seed test data
npm run seed

# Clear test data
npm run seed clear

# Deploy to Firebase
firebase deploy --only functions

# View logs
firebase functions:log
```

## 🐛 Troubleshooting

### Issue: "Firebase project not found"
**Solution:** Update `.firebaserc` with your project ID:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### Issue: "Service account not found" when seeding
**Solution:** 
1. Download service account key from Firebase Console
2. Save as `functions/service-account.json`
3. Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Issue: "CORS error" when calling API
**Solution:** Cloud Function already has CORS enabled. Check:
1. API_URL in `pixie.js` is correct
2. Emulators are running
3. Browser console shows the correct URL being called

### Issue: "Cannot find module" errors
**Solution:**
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Emulator won't start
**Solution:**
```bash
# Kill any processes using ports 5001, 8080, 4000
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
lsof -ti:4000 | xargs kill -9

# Restart emulators
firebase emulators:start
```

## 📚 Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Cloud Functions Pricing](https://firebase.google.com/pricing)

## 🔐 Security Checklist

- [ ] Service account key is in `.gitignore`
- [ ] Firestore security rules are configured
- [ ] Environment variables are set for production
- [ ] CORS is properly configured
- [ ] API rate limiting is considered (use Firebase App Check)
- [ ] Site status is validated on the backend

## 💰 Cost Optimization

1. **Caching**: API responses are cached for 5 minutes (reduces function calls)
2. **CDN**: Deploy `pixie.js` to a CDN with long cache times
3. **Firestore Reads**: Cache frequently accessed configs in Cloud Functions memory
4. **Monitoring**: Set up budget alerts in Firebase Console

---

**Ready to test!** Start the emulators, seed the database, and open your test page. 🚀
