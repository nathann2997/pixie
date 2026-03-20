# Platform-Aware Event System — Design Spec

**Goal:** Redesign the add-event experience so it understands each advertising platform's standard events, required parameters, naming conventions, and unique identifiers — while adding event templates, testing/preview, and dynamic value mapping.

**Scope:** 5 subsystems, implemented in phases:
1. Platform event data model + redesigned add-event modal
2. Event templates (industry bundles)
3. Conversion value mapping (dynamic values from DOM)
4. Event testing/preview

---

## 1. Platform Event Data Model

### File: `dashboard/lib/platform-events.ts`

A single source of truth for every platform's standard events, naming conventions, required fields, and parameters.

### Types

```typescript
type Platform = 'ga4' | 'meta' | 'tiktok' | 'linkedin' | 'google_ads';

type EventCategory = 'ecommerce' | 'lead_gen' | 'engagement' | 'other';

interface ParamDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'boolean' | 'string_array';
  placeholder?: string;
  defaultValue?: string;
  platforms?: Platform[];  // If only relevant to specific platforms (omit = all)
}

interface StandardEvent {
  id: string;                         // Internal canonical ID (e.g., "purchase")
  displayName: string;                // Human label (e.g., "Purchase")
  names: Partial<Record<Platform, string>>;  // Per-platform event name mapping
  category: EventCategory;
  description: string;
  requiredParams: ParamDef[];
  commonParams: ParamDef[];
}

interface PlatformConfig {
  id: Platform;
  label: string;
  icon: string;                       // Lucide icon name or brand SVG
  namingConvention: 'snake_case' | 'PascalCase' | 'fixed';
  firingPrefix: string;               // e.g., "gtag('event'," / "fbq('track',"
  supportsCustomEvents: boolean;
  extraFields: PlatformField[];       // Fields required when this platform is selected
}

interface PlatformField {
  key: string;
  label: string;
  type: 'string' | 'number';
  placeholder: string;
  required: boolean;
  helpText?: string;
}
```

### Platform Configs

| Platform | Naming | Custom Events | Extra Fields Required |
|----------|--------|--------------|----------------------|
| GA4 | snake_case | Yes (any name, max 40 chars) | None |
| Meta | PascalCase | Yes (via `trackCustom`, max 50 chars) | None |
| TikTok | PascalCase | Yes (any non-standard name) | None |
| LinkedIn | N/A (no event names) | No (conversion ID only) | `conversion_id` (required, numeric) |
| Google Ads | Fixed (`"conversion"`) | No (uses labels) | `conversion_id` (required), `conversion_label` (required) |

### Standard Events Catalog

**E-commerce:**

| ID | GA4 | Meta | TikTok | Description |
|----|-----|------|--------|-------------|
| `purchase` | `purchase` | `Purchase` | `Purchase` | Transaction completed |
| `add_to_cart` | `add_to_cart` | `AddToCart` | `AddToCart` | Item added to cart |
| `view_item` | `view_item` | `ViewContent` | `ViewContent` | Product page viewed |
| `begin_checkout` | `begin_checkout` | `InitiateCheckout` | `InitiateCheckout` | Checkout started |
| `add_payment_info` | `add_payment_info` | `AddPaymentInfo` | `AddPaymentInfo` | Payment info entered |
| `add_to_wishlist` | `add_to_wishlist` | `AddToWishlist` | `AddToWishlist` | Item wishlisted |
| `remove_from_cart` | `remove_from_cart` | — | — | Item removed from cart |
| `view_cart` | `view_cart` | — | — | Cart page viewed |
| `add_shipping_info` | `add_shipping_info` | — | — | Shipping info entered |
| `refund` | `refund` | — | — | Purchase refunded |

**Lead Generation:**

| ID | GA4 | Meta | TikTok | Description |
|----|-----|------|--------|-------------|
| `generate_lead` | `generate_lead` | `Lead` | `Lead` | Lead form submitted |
| `sign_up` | `sign_up` | `CompleteRegistration` | `CompleteRegistration` | Account created |
| `contact` | `contact` | `Contact` | `Contact` | User contacted business |
| `subscribe` | `subscribe` | — | `Subscribe` | Newsletter/service subscribed |
| `start_trial` | — | `StartTrial` | `StartTrial` | Trial started |
| `submit_application` | — | `SubmitApplication` | `SubmitApplication` | Application submitted |

**Engagement:**

| ID | GA4 | Meta | TikTok | Description |
|----|-----|------|--------|-------------|
| `search` | `search` | `Search` | `Search` | Site search performed |
| `share` | `share` | — | — | Content shared |
| `login` | `login` | — | — | User logged in |
| `download` | — | — | `Download` | File downloaded |
| `find_location` | — | `FindLocation` | — | Location searched |

A `—` means the platform has no standard equivalent. For multi-platform events, platforms without a standard mapping are silently skipped (or user can provide a custom name).

### Required & Common Parameters Per Event

**Purchase:**
- Required: `currency` (ISO 4217 dropdown), `value` (number)
- Common: `transaction_id` (string), `content_ids` (string array)

**AddToCart / ViewItem:**
- Required: none
- Common: `currency`, `value`, `content_ids`

**GenerateLead / Contact:**
- Required: none
- Common: `currency`, `value`

**SignUp / CompleteRegistration:**
- Required: none
- Common: `method` (GA4 only — string)

**Search:**
- Required: `search_term` (GA4), `search_string` (Meta/TikTok)
- Common: none

**Google Ads (all events):**
- Required: `send_to` (auto-composed from conversion_id + conversion_label)
- Common: `value`, `currency`, `transaction_id`

**LinkedIn (all events):**
- Required: `conversion_id` (numeric)
- Common: `event_id` (string, for deduplication)

---

## 2. Redesigned Add Event Modal

### Step 1: Intent & Platforms

**Event type toggle** at the top: `Standard` | `Custom`

**Standard mode:**
- Searchable dropdown of standard events, grouped by category (E-commerce, Lead Gen, Engagement)
- Selecting an event auto-fills the `displayName` and per-platform names
- A collapsed "Platform names" preview shows: `purchase (GA4) · Purchase (Meta) · Purchase (TikTok)`

**Custom mode:**
- Freeform name input
- Helper text adapts per selected platforms: "GA4 uses snake_case · Meta uses PascalCase"
- Per-platform name fields appear (editable, pre-filled with auto-formatted versions of the custom name)

**Platform checkboxes:**
- GA4, Meta, TikTok, LinkedIn, Google Ads
- When LinkedIn is checked → `Conversion ID` input appears inline (required, numeric, help text: "Found in LinkedIn Campaign Manager → Conversions")
- When Google Ads is checked → `Conversion ID` and `Conversion Label` inputs appear inline (required, help text: "Found in Google Ads → Tools → Conversions → Tag setup")

### Step 2: Trigger, Parameters & Preview

**Trigger section** (unchanged from current):
- Text match / URL match / CSS selector

**Parameters section** (new):
- Card below the trigger with two zones:
  - **Required parameters** — red dot indicator, cannot submit without filling
  - **Common parameters** — pre-shown, optional, collapsible
- "+ Add parameter" button for arbitrary key/value pairs
- Parameter input types adapt:
  - `currency` → dropdown of common ISO codes (USD, EUR, GBP, AUD, CAD, etc.)
  - `value` → number input with value mapping toggle (see Section 5)
  - `content_ids` → tag-style multi-input
  - `transaction_id` → text input
  - `string` / `number` → appropriate HTML input

**Preview button** (see Section 4):
- Appears once required fields are filled
- Opens slide-out showing generated scripts per platform

**Submit** creates the event rules and saves to Firestore `trackingConfig.events[]`.

### Data Shape (EventRule — updated)

```typescript
interface EventRule {
  id: string;
  displayName: string;
  eventType: 'standard' | 'custom';
  standardEventId?: string;          // Reference to StandardEvent.id
  platforms: Platform[];
  platformNames: Partial<Record<Platform, string>>;
  trigger: 'click' | 'submit' | 'pageview';
  selector: string;                   // CSS selector, text=, or url=
  params: EventParam[];
  platformFields: {
    linkedin_conversion_id?: string;
    google_ads_conversion_id?: string;
    google_ads_conversion_label?: string;
  };
  createdAt: string;
}

interface EventParam {
  key: string;
  value: string | number | boolean;
  valueSource: 'static' | 'data_attribute' | 'css_selector' | 'json_ld';
  dynamicConfig?: {
    selector: string;                 // The data-attr name, CSS selector, or JSON-LD path
    transform: 'as_is' | 'strip_currency' | 'parse_number';
  };
}
```

---

## 3. Event Templates

### File: `dashboard/lib/event-templates.ts`

```typescript
interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;                       // Lucide icon name
  events: string[];                   // Array of StandardEvent.id references
}
```

### Templates

| ID | Name | Events |
|----|------|--------|
| `ecommerce` | E-commerce Starter | purchase, add_to_cart, view_item, begin_checkout, add_payment_info |
| `lead_gen` | Lead Generation | generate_lead, sign_up, contact |
| `saas` | SaaS / Free Trial | sign_up, start_trial, purchase, subscribe |
| `content` | Content & Engagement | search, view_item, share, download |
| `restaurant` | Restaurant / Booking | contact, find_location, purchase |

### UI Location

- Top of the Events page **Builder** tab, as a horizontal scrollable row of cards
- Only visible when the site has fewer than 3 events
- Clicking a template opens a modal:
  1. Lists all events in the template as a checklist (all checked by default)
  2. Platform multi-select (shared across all events)
  3. Platform-specific fields prompted once (e.g., one LinkedIn Conversion ID for all events)
  4. "Add all" button creates all checked events at once
- Each event gets default trigger `pageview` with selector `url=/` — user can edit individually afterward

---

## 4. Event Testing / Preview

### Component: `dashboard/components/dashboard/event-preview-panel.tsx`

A slide-out panel (or modal) that renders a dry-run preview of what the event will fire.

**Contents:**

1. **Per-platform script blocks** — Syntax-highlighted code showing the exact call:
   ```javascript
   // GA4
   gtag('event', 'purchase', { currency: 'USD', value: 99.99, transaction_id: '' });

   // Meta
   fbq('track', 'Purchase', { currency: 'USD', value: 99.99 });

   // TikTok
   ttq.track('Purchase', { currency: 'USD', value: 99.99 });
   ```

2. **Validation checklist** — Green/amber/red indicators:
   - All required parameters filled
   - Event name valid for each platform
   - Platform-specific IDs present (LinkedIn, Google Ads)
   - Pixel connected for each selected platform (cross-checks `trackingConfig.pixels`)
   - Dynamic values flagged: "Will read from `.product-price` at runtime"

3. **"Copy script" button** — Copies all platform scripts for manual browser console testing

**When shown:**
- As a "Preview" button on the add-event modal (Step 2), enabled once required fields are filled
- Also accessible from the event detail view for existing events (read-only mode)

**No network calls.** This is purely client-side code generation.

---

## 5. Conversion Value Mapping

### When it appears

On any `number` parameter field (primarily `value`, but also `quantity`), a toggle appears: **Static** | **Dynamic**

### Static mode (default)

Standard number input. Value is hardcoded in the tracking script.

### Dynamic mode

Three source options in a dropdown:

| Source | Input | What it does |
|--------|-------|-------------|
| Data attribute | Attribute name (e.g., `data-price`) | Reads the attribute from the matched element or walks up ancestors |
| CSS selector | CSS selector (e.g., `.product-price`) | Reads `.textContent` from the targeted element |
| JSON-LD path | Dot-notation path (e.g., `Product.offers.price`) | Parses `<script type="application/ld+json">` and extracts the value |

**Transform dropdown** (applied after extraction):
- `As-is` — Use raw value
- `Strip currency symbols` — Remove `$`, `€`, `£`, commas, then parse as float
- `Parse number` — Extract first numeric value from the string

### Generated script output

For a dynamic `value` from CSS selector `.product-price` with `strip_currency` transform:

```javascript
var _raw = (document.querySelector('.product-price') || {}).textContent || '';
var value = parseFloat(_raw.replace(/[^0-9.]/g, '')) || 0;
```

This gets embedded into the per-platform firing scripts in the event preview.

### Data storage

Dynamic config is stored in the `EventParam.dynamicConfig` field (see Section 2 data shape). The script generation logic in `pigxel.js` (or a new Cloud Function) reads this config and produces the appropriate runtime extraction code.

---

## Implementation Phases

| Phase | What | Dependencies |
|-------|------|-------------|
| 1 | Platform event data model (`platform-events.ts`) | None |
| 2 | Redesigned add-event modal (standard/custom toggle, platform fields, parameters) | Phase 1 |
| 3 | Event templates (`event-templates.ts` + template modal) | Phase 1, 2 |
| 4 | Conversion value mapping (dynamic toggle on parameter fields) | Phase 2 |
| 5 | Event testing/preview panel | Phase 2, 4 |

Each phase produces working, testable software independently.

---

## Out of Scope

- Editing existing events inline (can be added later, same modal in edit mode)
- Server-side event forwarding (Conversions API for Meta, Measurement Protocol for GA4)
- Consent management integration
- A/B testing of events
- Event deduplication logic in `pigxel.js` (the `transaction_id` / `event_id` params enable it, but the dedup logic itself is out of scope)
