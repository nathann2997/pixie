# Pixie Cloud Functions

Firebase Cloud Functions for serving tracking configuration to the Pixie agent.

## 📁 Structure

```
functions/
├── src/
│   └── index.ts           # Main Cloud Functions entry point
├── scripts/
│   └── seed-db.ts         # Firestore seeding script
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## 🎯 Available Functions

### `getSiteConfig`

**Endpoint:** `GET /getSiteConfig?id={siteId}`

Fetches tracking configuration for a site based on its status.

**Status Logic (Safety Switch):**
- `pending` or `paused` → Returns empty config (script installed but not tracking)
- `active` → Returns full tracking configuration

**Response Headers:**
- `Cache-Control: public, max-age=300, s-maxage=600`
- `Content-Type: application/json`
- CORS enabled for all origins

**Example Request:**
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"
```

**Example Response (Active):**
```json
{
  "status": "active",
  "pixels": {
    "ga4": "G-TEST-123",
    "meta": "123-TEST"
  },
  "events": [
    {
      "selector": "#buy-btn",
      "trigger": "click",
      "platform": "ga4",
      "event_name": "purchase"
    }
  ]
}
```

**Example Response (Pending/Paused):**
```json
{
  "status": "pending",
  "pixels": {},
  "events": []
}
```

### `healthCheck`

**Endpoint:** `GET /healthCheck`

Simple health check endpoint.

**Example Response:**
```json
{
  "status": "healthy",
  "service": "pixie-api",
  "version": "1.0.0",
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Build TypeScript
```bash
npm run build
```

### Start Emulators
```bash
# From project root
firebase emulators:start
```

### Seed Test Data
```bash
npm run seed
```

## 📜 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:watch` | Watch mode - auto-recompile on changes |
| `npm run serve` | Build and start emulators |
| `npm run seed` | Populate Firestore with test data |
| `npm run seed clear` | Clear test data from Firestore |
| `npm run deploy` | Deploy functions to Firebase |
| `npm run logs` | View Firebase function logs |

## 🗄️ Database Schema

### Collection: `sites`

| Field | Type | Description |
|-------|------|-------------|
| `owner_id` | string | User ID who owns the site |
| `url` | string | Site URL |
| `status` | string | `'pending'`, `'active'`, or `'paused'` |
| `trackingConfig` | object | Pixel and event configuration |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### TrackingConfig Object

```typescript
{
  pixels: {
    ga4?: string;      // Google Analytics 4 Measurement ID
    meta?: string;     // Meta (Facebook) Pixel ID
  },
  events: [
    {
      selector: string;           // CSS selector
      trigger: 'click' | 'submit';
      platform: 'ga4' | 'meta';
      event_name: string;
      event_data?: object;        // Optional parameters
    }
  ]
}
```

## 🧪 Testing

### Test Active Site
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_active"
```

Expected: Full tracking config with GA4 and Meta pixels

### Test Pending Site
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=client_pending"
```

Expected: Empty config with status "pending"

### Test Invalid Site
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=invalid!!!id"
```

Expected: 400 Bad Request

### Test Non-existent Site
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/getSiteConfig?id=does-not-exist"
```

Expected: 404 Not Found

## 🛠️ Development

### Add a New Cloud Function

1. Add function to `src/index.ts`:
```typescript
export const myNewFunction = functions.https.onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Your logic here
    res.json({ message: 'Hello!' });
  }
);
```

2. Build and test:
```bash
npm run build
firebase emulators:start
```

3. Test the function:
```bash
curl "http://127.0.0.1:5001/pixie-dev/us-central1/myNewFunction"
```

### TypeScript Types

All types are defined in `src/index.ts`:
- `SiteDocument` - Firestore site document structure
- `TrackingConfig` - Tracking configuration object
- `TrackingEvent` - Individual event definition
- `PausedResponse` - API response for paused/pending sites
- `ActiveResponse` - API response for active sites

## 🚢 Deployment

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:getSiteConfig
```

### View Deployment Logs
```bash
firebase functions:log
```

## 🔍 Monitoring

### View Function Logs
```bash
# Real-time logs
firebase functions:log --only getSiteConfig

# Last 10 log entries
firebase functions:log --limit 10
```

### In Firebase Console
1. Go to Firebase Console → Functions
2. Click on function name
3. View logs, metrics, and errors

## 🔐 Security

### Service Account
- Never commit `service-account.json`
- Already added to `.gitignore`
- Download from Firebase Console → Project Settings → Service Accounts

### Firestore Rules
Create `firestore.rules` in project root:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sites/{siteId} {
      allow read: if true;  // Cloud Functions need read access
      allow write: if request.auth != null;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## 💡 Best Practices

1. **Error Handling**: All functions use try/catch blocks
2. **Logging**: Use `functions.logger` for structured logging
3. **Validation**: Input validation for all parameters
4. **Caching**: Response caching to reduce costs
5. **CORS**: Enabled for cross-origin requests
6. **Types**: Full TypeScript typing for safety

## 🐛 Troubleshooting

### Build Errors
```bash
rm -rf lib node_modules package-lock.json
npm install
npm run build
```

### Emulator Issues
```bash
# Kill processes on ports
lsof -ti:5001 | xargs kill -9

# Clear emulator data
rm -rf ~/.config/firebase/

# Restart
firebase emulators:start
```

### Seeding Fails
Check that:
1. `service-account.json` exists in `functions/` directory
2. Emulators are running
3. Firestore emulator is accessible

## 📊 Performance Tips

1. **Cache Config in Memory**: Store frequently accessed configs
2. **Batch Firestore Reads**: Use batch reads for multiple sites
3. **CDN Caching**: Leverage s-maxage header (10 minutes)
4. **Minimize Cold Starts**: Use min instances in production

## 📚 Additional Resources

- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Cloud Functions Pricing](https://firebase.google.com/pricing)
- [TypeScript in Cloud Functions](https://firebase.google.com/docs/functions/typescript)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)

---

**Questions?** Check the main project README or Firebase documentation.
