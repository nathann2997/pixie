# 🧚 Pixie Dashboard

Modern Next.js 14 dashboard for managing the Pixie AI Marketing Agent with real-time Firebase integration.

## ✨ Features

- **🔐 Firebase Authentication** - Google Sign-In + Email/Password
- **⚡ Real-time Updates** - Live Firestore snapshots for instant UI updates
- **🎛️ Master Switch** - Toggle tracking on/off for any site
- **📋 Copy Installation Code** - One-click copy of tracking script
- **🌙 Dark Mode** - Beautiful purple/zinc dark theme
- **🔒 Protected Routes** - AuthGuard component for secure pages
- **📱 Responsive Design** - Works on all devices

## 🏗️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Authentication:** Firebase Auth
- **Database:** Firestore (real-time)
- **Icons:** Lucide React
- **Language:** TypeScript

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

The project is already configured to work with Firebase Emulators. The `.env.local` file is set up for local development.

For production, create a real Firebase project and update `.env.local` with your credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-real-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Start Firebase Emulators

Make sure Firebase emulators are running from the parent directory:

```bash
cd .. && firebase emulators:start
```

This starts:
- Auth Emulator: `http://127.0.0.1:9099`
- Firestore Emulator: `http://127.0.0.1:8080`
- Functions Emulator: `http://127.0.0.1:5001`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Pages

### `/login`
- Clean, centered login card
- Google Sign-In button
- Email/Password authentication
- Sign up/Sign in toggle

### `/dashboard`
- Lists all sites owned by the user
- Real-time updates when sites change
- Click any site card to manage

### `/dashboard/[siteId]`
- **Site Header** - Shows URL and status badge
- **Master Switch** - Toggle between Active/Paused
- **Installation Code** - Script tag with copy button
- **Configuration** - View pixels and events
- Real-time updates when status changes

## 🎨 UI Components

All UI components are in `components/ui/`:

- `button.tsx` - Button with variants
- `card.tsx` - Card container with header/content/footer
- `badge.tsx` - Status badges (success/warning/secondary)
- `switch.tsx` - Toggle switch for master control
- `input.tsx` - Form inputs
- `label.tsx` - Form labels

## 🔒 Authentication Flow

1. User visits any page
2. `FirebaseProvider` checks auth state
3. `AuthGuard` protects dashboard routes
4. Unauthenticated users → `/login`
5. After login → `/dashboard`

## 🔄 Real-time Data Flow

```
Firestore Database
       ↓
  onSnapshot()
       ↓
  React State
       ↓
    UI Updates
```

### Dashboard Page
```typescript
// Real-time listener for user's sites
const q = query(
  collection(db, 'sites'),
  where('owner_id', '==', user.uid)
);

onSnapshot(q, (snapshot) => {
  // Update sites list
});
```

### Site Detail Page
```typescript
// Real-time listener for specific site
onSnapshot(
  doc(db, 'sites', siteId),
  (doc) => {
    // Update site data
  }
);
```

## 🎛️ Master Switch

The master switch updates the `status` field in Firestore:

```typescript
const handleStatusToggle = async (checked: boolean) => {
  const newStatus = checked ? 'active' : 'paused';
  await updateDoc(doc(db, 'sites', siteId), {
    status: newStatus,
  });
};
```

The Cloud Function `getSiteConfig` reads this status and returns:
- **active** → Full tracking config
- **paused** → Empty config (no tracking)
- **pending** → Empty config (setup incomplete)

## 📂 Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx           # Root layout with FirebaseProvider
│   ├── page.tsx             # Home (redirects to dashboard/login)
│   ├── login/
│   │   └── page.tsx         # Login page
│   └── dashboard/
│       ├── page.tsx         # Site list
│       └── [siteId]/
│           └── page.tsx     # Site detail
├── components/
│   ├── ui/                  # Shadcn UI components
│   ├── auth/
│   │   └── auth-guard.tsx   # Route protection
│   └── providers/
│       └── firebase-provider.tsx  # Auth state provider
├── lib/
│   ├── firebase.ts          # Firebase initialization
│   └── utils.ts             # Utility functions
└── .env.local               # Environment variables
```

## 🎨 Theming

The dashboard uses a dark purple/zinc theme defined in `app/globals.css`:

- **Primary:** Purple (#9333ea)
- **Background:** Zinc 950
- **Cards:** Zinc 950/50 with backdrop blur
- **Borders:** Zinc 800

### Color Variables

```css
--background: 240 10% 3.9%
--foreground: 210 20% 98%
--primary: 263.4 70% 50.4%  /* Purple */
--card: 240 10% 3.9%
--border: 240 3.7% 15.9%
```

## 🔧 Configuration

### Firebase Emulators (Development)

The app automatically connects to emulators when `NODE_ENV === 'development'`:

```typescript
connectAuthEmulator(auth, 'http://127.0.0.1:9099');
connectFirestoreEmulator(db, '127.0.0.1', 8080);
```

### Production

For production:
1. Remove emulator connection code from `lib/firebase.ts`
2. Update `.env.local` with real Firebase credentials
3. Deploy to Vercel/Netlify

## 🧪 Testing

### Test User Account

Create a test user in Firebase Auth Emulator:
1. Open http://127.0.0.1:4000
2. Go to Authentication tab
3. Add test user manually

Or sign up via the dashboard at http://localhost:3000/login

### Test Sites

Use the seeded sites from the backend:
- `client_active` - Active site with full tracking
- `client_pending` - Pending site (no tracking)
- `client_paused` - Paused site (tracking disabled)

**Note:** Make sure to update the `owner_id` in Firestore to match your test user's UID!

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Environment Variables (Production)

Set these in your hosting platform:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 📝 Common Tasks

### Add a New Site Manually

In Firebase Console or Emulator UI:

```javascript
{
  owner_id: "user-uid-here",
  url: "https://example.com",
  status: "pending",
  trackingConfig: {
    pixels: {
      ga4: "G-XXXXXXXXX",
      meta: "123456789"
    },
    events: []
  },
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
}
```

### Update Site Status

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

await updateDoc(doc(db, 'sites', siteId), {
  status: 'active', // or 'paused' or 'pending'
});
```

## 🐛 Troubleshooting

### "Firebase: Error (auth/network-request-failed)"

**Solution:** Make sure Firebase emulators are running:
```bash
firebase emulators:start
```

### "Site not found" error

**Solution:** Check that the site's `owner_id` matches your logged-in user's UID.

### Real-time updates not working

**Solution:** 
1. Check Firestore emulator is running on port 8080
2. Verify connection in browser DevTools Network tab
3. Check for Firestore security rules (should allow reads)

### Dark mode not applying

**Solution:** Check that `className="dark"` is on the `<html>` tag in `app/layout.tsx`

## 📚 Additional Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contributing

The dashboard is part of the Pixie project. See the main README for contribution guidelines.

---

**Built with ❤️ using Next.js 14, Firebase, and Shadcn UI**
