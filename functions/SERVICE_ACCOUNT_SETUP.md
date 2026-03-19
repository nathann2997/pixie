# Service Account Setup

The Firebase Admin SDK service account key is NOT stored in the repository.

## Local Development (Emulator)
No service account needed — the emulator uses `admin.initializeApp()` without credentials.

## Production (Cloud Functions)
Cloud Functions automatically authenticate via the default service account.
No key file is needed.

## If you need a key for manual scripts
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `functions/service-account.json` (gitignored)
4. NEVER commit this file
