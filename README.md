# Pigxel - Marketing Tracking Agent

A production-ready, full-stack marketing pixel management system with intelligent status-based tracking control.

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes ⚡
- **[TESTING.md](TESTING.md)** - Complete testing guide 🧪
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Production deployment 🚀
- **[API.md](API.md)** - Backend API documentation 📡
- **[functions/README.md](functions/README.md)** - Cloud Functions guide ☁️

## 🎯 Features

### Frontend (pigxel.js)
- **Self-Loading**: Automatically extracts configuration from its own script tag
- **Conflict Prevention**: Detects existing GA4/Meta pixels and reuses them instead of double-loading
- **SPA Compatible**: Uses event delegation to track dynamically added elements (React, Vue, Angular, etc.)
- **Fail-Safe**: Wrapped in try/catch blocks to ensure your site continues working even if Pigxel crashes
- **Debug Mode**: Built-in debug logging for development and troubleshooting
- **Zero Dependencies**: Pure vanilla JavaScript, no external libraries required
- **IIFE Wrapped**: No global scope pollution

### Backend (Firebase)
- **Safety Switch**: Status-based tracking control (pending/active/paused)
- **Cloud Functions**: Serverless API for configuration delivery
- **Firestore**: Real-time database for site configurations
- **Caching**: Built-in response caching (5 min browser, 10 min CDN)
- **CORS Enabled**: Works from any domain
- **Type-Safe**: Full TypeScript implementation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Website                        │
│                                                               │
│  <script src="pigxel.js?id=client_123"></script>             │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              pigxel.js (Frontend)                      │   │
│  │  • Extracts client ID from URL                        │   │
│  │  • Fetches config from Cloud Function                 │   │
│  │  • Checks status (safety switch)                      │   │
│  │  • Loads pixels if status = 'active'                  │   │
│  │  • Tracks events via event delegation                 │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Function                   │
│                                                               │
│  GET /getSiteConfig?id=client_123                            │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           getSiteConfig Function                      │   │
│  │  1. Validate client ID                                │   │
│  │  2. Fetch from Firestore                              │   │
│  │  3. Check status field:                               │   │
│  │     • pending/paused → empty config                   │   │
│  │     • active → full config                            │   │
│  │  4. Add cache headers                                 │   │
│  │  5. Return JSON                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      Firestore Database                      │
│                                                               │
│  Collection: sites                                            │
│  ├── client_active                                            │
│  │   ├── status: "active"                                    │
│  │   └── trackingConfig: { pixels, events }                 │
│  ├── client_pending                                           │
│  │   ├── status: "pending"                                   │
│  │   └── trackingConfig: { ... }                            │
│  └── client_paused                                            │
│      ├── status: "paused"                                    │
│      └── trackingConfig: { ... }                            │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Safety Switch Logic

The status field acts as a safety switch to control tracking:

| Status | Behavior | Use Case |
|--------|----------|----------|
| `pending` | Script loads but doesn't track | User installed script but hasn't authorized yet |
| `active` | Full tracking enabled | Normal operation |
| `paused` | Script loads but doesn't track | Temporarily disabled (billing, maintenance, etc.) |

This ensures the website never breaks, even if the user hasn't completed setup.

## 🚀 Quick Start

### Installation

Add the following script tag to your HTML, typically in the `<head>` or before `</body>`:

```html
<!-- Production -->
<script src="https://cdn.yoursite.com/pigxel.js?id=YOUR_CLIENT_ID"></script>

<!-- Development (with debug logging) -->
<script src="https://cdn.yoursite.com/pigxel.js?id=YOUR_CLIENT_ID&debug=true"></script>
```

**That's it!** Pigxel will automatically:
1. Extract the client ID from the URL
2. Fetch configuration from your backend
3. Load necessary pixels (GA4, Meta)
4. Start tracking configured events

### Local Testing

Open `test.html` in your browser to see Pigxel in action:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then navigate to: `http://localhost:8000/test.html`

## 📋 Configuration Format

Pigxel expects a JSON configuration with the following structure:

```json
{
  "pixels": {
    "ga4": "G-XXXXXX",
    "meta": "123456789"
  },
  "events": [
    {
      "selector": "#buy-btn",
      "trigger": "click",
      "platform": "ga4",
      "event_name": "purchase"
    },
    {
      "selector": ".signup-form",
      "trigger": "submit",
      "platform": "meta",
      "event_name": "Lead"
    },
    {
      "selector": "[data-event='add_to_cart']",
      "trigger": "click",
      "platform": "ga4",
      "event_name": "add_to_cart"
    }
  ]
}
```

### Configuration Fields

#### `pixels` (Object)
Defines which tracking pixels to load:
- `ga4` (string): Google Analytics 4 Measurement ID (e.g., "G-XXXXXXXXX")
- `meta` (string): Meta (Facebook) Pixel ID

#### `events` (Array)
Defines event tracking rules. Each event has:
- `selector` (string): CSS selector to match elements
- `trigger` (string): Event type - either "click" or "submit"
- `platform` (string): Where to send the event - "ga4" or "meta"
- `event_name` (string): Name of the event to track

### Selector Examples

```javascript
// ID selector
"#buy-btn"

// Class selector
".signup-form"

// Data attribute
"[data-event='add_to_cart']"

// Complex selectors
".product-card button.buy-now"
"form[name='checkout']"
```

## 🏗️ Architecture

### Core Components

1. **Script Parameter Extraction**
   - Identifies the current script tag
   - Extracts `id` and `debug` query parameters
   - Gracefully exits if ID is missing

2. **Configuration Management**
   - `fetchConfig(clientId)` - Async function to fetch client configuration
   - Currently mocked for testing, easily replaceable with real API call

3. **Smart Pixel Loading**
   - `loadPixel(type, id)` - Loads GA4 or Meta pixels
   - `isPixelAlreadyLoaded(type)` - Prevents double-loading
   - Checks both global functions (`gtag`, `fbq`) and script tags

4. **Event Tracking System**
   - Document-level event delegation for SPA compatibility
   - `handleDOMEvent()` - Matches events against configuration
   - `trackEvent()` - Sends events to appropriate platform

5. **Error Handling**
   - All critical functions wrapped in try/catch
   - `handleError()` - Non-intrusive error logging
   - Ensures user's website continues functioning

### Data Flow

```
Script Load
    ↓
Extract Parameters (id, debug)
    ↓
Fetch Configuration
    ↓
Load Pixels (GA4, Meta)
    ↓
Attach Event Listeners
    ↓
User Interaction → Match Selector → Track Event
```

## 🔧 Technical Decisions

### 1. IIFE Wrapper
```javascript
(function() {
  'use strict';
  // All code here
})();
```
- Prevents global scope pollution
- Creates private scope for variables
- `'use strict'` enables strict mode for better error catching

### 2. Event Delegation
```javascript
document.addEventListener('click', handleDOMEvent, true);
document.addEventListener('submit', handleDOMEvent, true);
```
- Single listener at document level (efficient)
- Uses `event.target.closest(selector)` to match elements
- **Critical for SPA support** - catches clicks on dynamically added elements

### 3. Conflict Detection
Before loading a pixel, check if it already exists:
```javascript
// Check for gtag function
typeof window.gtag === 'function'

// Check for script tags
Array.from(document.scripts).some(script => 
  script.src.includes('googletagmanager.com')
)
```

### 4. Form Submission Handling
```javascript
if (eventType === 'submit') {
  event.preventDefault();
  trackEvent(...);
  setTimeout(() => matchedElement.submit(), 100);
}
```
- Prevent default submission
- Track event first
- Submit after 100ms delay to ensure tracking completes

## 🐛 Debugging

### Enable Debug Mode

Add `?debug=true` to the script URL:
```html
<script src="pigxel.js?id=test-client-123&debug=true"></script>
```

This will output detailed logs:
```
[Pigxel] Script parameters extracted { id: 'test-client-123', debug: true }
[Pigxel] Fetching configuration for client test-client-123
[Pigxel] Configuration loaded { pixels: {...}, events: [...] }
[Pigxel] Loading ga4 pixel G-XXXXXX
[Pigxel] GA4 pixel injected G-XXXXXX
[Pigxel] Event listeners attached (SPA-compatible)
[Pigxel] Event matched { selector: '#buy-btn', trigger: 'click', ... }
[Pigxel] GA4 event sent { eventName: 'purchase' }
```

### Console Methods
```javascript
// Check if Pigxel loaded
console.log(typeof window.gtag, typeof window.fbq);

// Check loaded scripts
Array.from(document.scripts).filter(s => 
  s.src.includes('googletagmanager') || s.src.includes('fbevents')
);

// Monitor dataLayer
console.log(window.dataLayer);
```

## 🔄 Production Deployment

### Step 1: Replace Mock Configuration

In `pigxel.js`, replace the mock config with a real API call:

```javascript
async function fetchConfig(clientId) {
  try {
    const response = await fetch(`https://api.yoursite.com/pixie/config/${clientId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const config = await response.json();
    return config;
  } catch (error) {
    handleError(error, 'fetchConfig');
    throw error;
  }
}
```

### Step 2: Minify & Deploy

```bash
# Install terser for minification
npm install -g terser

# Minify pigxel.js
terser pigxel.js -c -m -o pixie.min.js

# Deploy to CDN
# Upload pixie.min.js to your CDN (Cloudflare, AWS CloudFront, etc.)
```

### Step 3: CDN Configuration

Recommended CDN headers:
```
Cache-Control: public, max-age=3600, s-maxage=86400
Content-Type: application/javascript
Access-Control-Allow-Origin: *
```

### Step 4: Client Integration

Provide clients with:
```html
<script src="https://cdn.yoursite.com/pixie.min.js?id=CLIENT_ID"></script>
```

## 🧪 Testing Checklist

- [ ] Script loads without errors
- [ ] Client ID is extracted correctly
- [ ] Configuration is fetched successfully
- [ ] GA4 pixel loads (check Network tab for `googletagmanager.com`)
- [ ] Meta pixel loads (check Network tab for `fbevents.js`)
- [ ] Click events are tracked
- [ ] Submit events are tracked
- [ ] Dynamically added elements are tracked (SPA test)
- [ ] No errors in Console
- [ ] Website functionality is not affected
- [ ] Existing pixels are detected and reused

## 📊 Browser Support

- ✅ Chrome/Edge (last 2 versions)
- ✅ Firefox (last 2 versions)
- ✅ Safari (last 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- ES6 support (async/await, arrow functions, etc.)
- Fetch API
- Closest() method

For older browsers, consider using a polyfill service like Polyfill.io:
```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=fetch,Element.prototype.closest"></script>
<script src="pigxel.js?id=CLIENT_ID"></script>
```

## 🔐 Security Considerations

1. **Content Security Policy (CSP)**
   - Add `googletagmanager.com` and `facebook.net` to `script-src`
   - Add `connect-src` for API calls

2. **HTTPS Only**
   - Always serve pigxel.js over HTTPS
   - Pixel scripts are automatically loaded via HTTPS

3. **Input Validation**
   - Client ID is validated on the server
   - Configuration is served from trusted API

4. **No PII**
   - Never track sensitive personal information
   - Be GDPR/CCPA compliant

## 🎨 Customization

### Adding New Platforms

To add support for additional platforms (e.g., LinkedIn, Twitter):

1. Add platform to `loadPixel()`:
```javascript
else if (type === 'linkedin') {
  await loadLinkedInPixel(id);
}
```

2. Implement loader:
```javascript
async function loadLinkedInPixel(partnerId) {
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);
  
  const script = document.createElement('script');
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(script);
}
```

3. Add detection in `isPixelAlreadyLoaded()`:
```javascript
else if (type === 'linkedin') {
  return window._linkedin_data_partner_ids?.length > 0;
}
```

4. Add tracking in `trackEvent()`:
```javascript
else if (platform === 'linkedin' && window.lintrk) {
  window.lintrk('track', { conversion_id: eventName });
}
```

### Custom Event Data

To pass additional data with events, modify the configuration:

```json
{
  "selector": "#buy-btn",
  "trigger": "click",
  "platform": "ga4",
  "event_name": "purchase",
  "event_data": {
    "currency": "USD",
    "value": 99.99
  }
}
```

Then update `handleDOMEvent()`:
```javascript
trackEvent(
  eventConfig.platform, 
  eventConfig.event_name,
  eventConfig.event_data || {}
);
```

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- [ ] TypeScript definitions
- [ ] Unit tests
- [ ] Additional platform support (TikTok, Snapchat, etc.)
- [ ] A/B testing integration
- [ ] Custom event properties from DOM attributes

## 📬 Support

For issues or questions:
1. Check the debug logs (`?debug=true`)
2. Review the test page (`test.html`)
3. Open an issue on GitHub

---

**Built with ❤️ for modern web development**
