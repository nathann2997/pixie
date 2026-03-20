# Platform-Aware Event System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the event creation system with platform-aware standard/custom events, parameters, templates, value mapping, and preview — across GA4, Meta, TikTok, LinkedIn, and Google Ads.

**Architecture:** A shared `platform-events.ts` constants file defines all standard events, per-platform name mappings, and parameter definitions. The add-event modal consumes this data to render platform-specific forms. `pigxel.js` gains multi-platform firing, parameter support, and dynamic value extraction. A migration utility normalizes old event shapes on read.

**Tech Stack:** TypeScript, Next.js (App Router), React, Tailwind CSS, Firebase Firestore, Vanilla JS (pigxel.js)

**Spec:** `docs/superpowers/specs/2026-03-20-platform-aware-events-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `dashboard/lib/platform-events.ts` | Platform configs, standard events catalog, parameter definitions |
| `dashboard/lib/event-templates.ts` | Industry template bundles |
| `dashboard/lib/normalize-event.ts` | Migration: old EventRule → new EventRule normalization |
| `dashboard/components/dashboard/event-param-field.tsx` | Reusable parameter input (static/dynamic toggle, currency dropdown, etc.) |
| `dashboard/components/dashboard/event-preview-panel.tsx` | Script preview + validation checklist |
| `dashboard/components/dashboard/template-picker.tsx` | Template cards + template modal |
| `dashboard/components/dashboard/dynamic-value-config.tsx` | Dynamic value mapping UI (source dropdown, selector input, transform) |

### Modified files
| File | Changes |
|------|---------|
| `pigxel.js` + `dashboard/public/pigxel.js` | LinkedIn/Google Ads handlers, multi-platform firing, `buildParams()`, dynamic value helpers |
| `dashboard/components/dashboard/add-event-modal.tsx` | Full rewrite: standard/custom toggle, platform-aware fields, parameter section |
| `dashboard/components/dashboard/event-rules-list.tsx` | Read new EventRule shape (multi-platform, params) |
| `dashboard/app/dashboard/[siteId]/events/page.tsx` | ID-based operations, template picker, updated filter tabs |
| `dashboard/components/dashboard/event-chat.tsx` | Map AI chat output to new EventRule shape |

---

## Task 1: Platform Event Data Model

**Files:**
- Create: `dashboard/lib/platform-events.ts`

- [ ] **Step 1: Create the types and platform configs**

Create `dashboard/lib/platform-events.ts` with these exports:

```typescript
// ── Types ────────────────────────────────────────────────────────

export type Platform = 'ga4' | 'meta' | 'tiktok' | 'linkedin' | 'google_ads';

export type EventCategory = 'ecommerce' | 'lead_gen' | 'engagement';

export interface ParamDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'boolean' | 'string_array';
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  platforms?: Platform[];
}

export interface StandardEvent {
  id: string;
  displayName: string;
  names: Partial<Record<Platform, string>>;
  category: EventCategory;
  description: string;
  requiredParams: ParamDef[];
  commonParams: ParamDef[];
  defaultTrigger: 'click' | 'submit' | 'pageview';
  defaultSelector: string;
}

export interface PlatformField {
  key: string;
  label: string;
  type: 'string' | 'number';
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export interface PlatformConfig {
  id: Platform;
  label: string;
  color: string;
  namingConvention: 'snake_case' | 'PascalCase' | 'fixed' | 'none';
  supportsCustomEvents: boolean;
  customEventMaxLength?: number;
  extraFields: PlatformField[];
}

// ── Platform Configs ─────────────────────────────────────────────

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    color: '#F9AB00',
    namingConvention: 'snake_case',
    supportsCustomEvents: true,
    customEventMaxLength: 40,
    extraFields: [],
  },
  {
    id: 'meta',
    label: 'Meta Pixel',
    color: '#0081FB',
    namingConvention: 'PascalCase',
    supportsCustomEvents: true,
    customEventMaxLength: 50,
    extraFields: [],
  },
  {
    id: 'tiktok',
    label: 'TikTok Pixel',
    color: '#000000',
    namingConvention: 'PascalCase',
    supportsCustomEvents: true,
    extraFields: [],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    namingConvention: 'none',
    supportsCustomEvents: false,
    extraFields: [
      {
        key: 'linkedin_conversion_id',
        label: 'Conversion ID',
        type: 'number',
        placeholder: '12345678',
        required: true,
        helpText: 'Found in LinkedIn Campaign Manager → Conversions',
      },
    ],
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    color: '#4285F4',
    namingConvention: 'fixed',
    supportsCustomEvents: false,
    extraFields: [
      {
        key: 'google_ads_conversion_id',
        label: 'Conversion ID',
        type: 'string',
        placeholder: '1234567890',
        required: true,
        helpText: 'The number after AW- in your Google Ads tag',
      },
      {
        key: 'google_ads_conversion_label',
        label: 'Conversion Label',
        type: 'string',
        placeholder: 'abc1Def2Ghi3',
        required: true,
        helpText: 'Found in Google Ads → Tools → Conversions → Tag setup',
      },
    ],
  },
];

export function getPlatform(id: Platform): PlatformConfig {
  return PLATFORMS.find((p) => p.id === id)!;
}

// ── Shared Parameter Definitions ─────────────────────────────────

const PARAM_CURRENCY: ParamDef = { key: 'currency', label: 'Currency', type: 'currency', placeholder: 'USD', defaultValue: 'USD' };
const PARAM_VALUE: ParamDef = { key: 'value', label: 'Value', type: 'number', placeholder: '0.00' };
const PARAM_TRANSACTION_ID: ParamDef = { key: 'transaction_id', label: 'Transaction ID', type: 'string', placeholder: 'order_123' };
const PARAM_CONTENT_IDS: ParamDef = { key: 'content_ids', label: 'Content IDs', type: 'string_array', placeholder: 'SKU-001' };
const PARAM_METHOD: ParamDef = { key: 'method', label: 'Method', type: 'string', placeholder: 'google', platforms: ['ga4'] };
const PARAM_SEARCH_TERM_GA4: ParamDef = { key: 'search_term', label: 'Search query', type: 'string', placeholder: 'blue shoes', required: true, platforms: ['ga4'] };
const PARAM_SEARCH_STRING_OTHER: ParamDef = { key: 'search_string', label: 'Search query', type: 'string', placeholder: 'blue shoes', required: true, platforms: ['meta', 'tiktok'] };

// ── Standard Events Catalog ──────────────────────────────────────

export const STANDARD_EVENTS: StandardEvent[] = [
  // ── E-commerce ──
  {
    id: 'purchase',
    displayName: 'Purchase',
    names: { ga4: 'purchase', meta: 'Purchase', tiktok: 'Purchase', linkedin: 'conversion', google_ads: 'conversion' },
    category: 'ecommerce',
    description: 'Transaction completed',
    requiredParams: [PARAM_CURRENCY, PARAM_VALUE],
    commonParams: [PARAM_TRANSACTION_ID, PARAM_CONTENT_IDS],
    defaultTrigger: 'pageview',
    defaultSelector: 'url=/thank-you',
  },
  {
    id: 'add_to_cart',
    displayName: 'Add to Cart',
    names: { ga4: 'add_to_cart', meta: 'AddToCart', tiktok: 'AddToCart', linkedin: 'conversion', google_ads: 'conversion' },
    category: 'ecommerce',
    description: 'Item added to cart',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE, PARAM_CONTENT_IDS],
    defaultTrigger: 'click',
    defaultSelector: 'text=Add to Cart',
  },
  {
    id: 'view_item',
    displayName: 'View Item',
    names: { ga4: 'view_item', meta: 'ViewContent', tiktok: 'ViewContent' },
    category: 'ecommerce',
    description: 'Product page viewed',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE, PARAM_CONTENT_IDS],
    defaultTrigger: 'pageview',
    defaultSelector: '',
  },
  {
    id: 'begin_checkout',
    displayName: 'Begin Checkout',
    names: { ga4: 'begin_checkout', meta: 'InitiateCheckout', tiktok: 'InitiateCheckout', google_ads: 'conversion' },
    category: 'ecommerce',
    description: 'Checkout started',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'pageview',
    defaultSelector: 'url=/checkout',
  },
  {
    id: 'add_payment_info',
    displayName: 'Add Payment Info',
    names: { ga4: 'add_payment_info', meta: 'AddPaymentInfo', tiktok: 'AddPaymentInfo' },
    category: 'ecommerce',
    description: 'Payment info entered',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'add_to_wishlist',
    displayName: 'Add to Wishlist',
    names: { ga4: 'add_to_wishlist', meta: 'AddToWishlist', tiktok: 'AddToWishlist' },
    category: 'ecommerce',
    description: 'Item wishlisted',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'click',
    defaultSelector: 'text=Add to Wishlist',
  },
  {
    id: 'remove_from_cart',
    displayName: 'Remove from Cart',
    names: { ga4: 'remove_from_cart' },
    category: 'ecommerce',
    description: 'Item removed from cart',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'click',
    defaultSelector: '',
  },
  {
    id: 'view_cart',
    displayName: 'View Cart',
    names: { ga4: 'view_cart' },
    category: 'ecommerce',
    description: 'Cart page viewed',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'pageview',
    defaultSelector: 'url=/cart',
  },
  {
    id: 'add_shipping_info',
    displayName: 'Add Shipping Info',
    names: { ga4: 'add_shipping_info' },
    category: 'ecommerce',
    description: 'Shipping info entered',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'refund',
    displayName: 'Refund',
    names: { ga4: 'refund' },
    category: 'ecommerce',
    description: 'Purchase refunded',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE, PARAM_TRANSACTION_ID],
    defaultTrigger: 'pageview',
    defaultSelector: '',
  },
  // ── Lead Generation ──
  {
    id: 'generate_lead',
    displayName: 'Generate Lead',
    names: { ga4: 'generate_lead', meta: 'Lead', tiktok: 'Lead', linkedin: 'conversion', google_ads: 'conversion' },
    category: 'lead_gen',
    description: 'Lead form submitted',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'sign_up',
    displayName: 'Sign Up',
    names: { ga4: 'sign_up', meta: 'CompleteRegistration', tiktok: 'CompleteRegistration', linkedin: 'conversion', google_ads: 'conversion' },
    category: 'lead_gen',
    description: 'Account created',
    requiredParams: [],
    commonParams: [PARAM_METHOD],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'contact',
    displayName: 'Contact',
    names: { ga4: 'contact', meta: 'Contact', tiktok: 'Contact', linkedin: 'conversion', google_ads: 'conversion' },
    category: 'lead_gen',
    description: 'User contacted business',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'subscribe',
    displayName: 'Subscribe',
    names: { ga4: 'subscribe', tiktok: 'Subscribe' },
    category: 'lead_gen',
    description: 'Newsletter/service subscribed',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'start_trial',
    displayName: 'Start Trial',
    names: { meta: 'StartTrial', tiktok: 'StartTrial', google_ads: 'conversion' },
    category: 'lead_gen',
    description: 'Trial started',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'submit_application',
    displayName: 'Submit Application',
    names: { meta: 'SubmitApplication', tiktok: 'SubmitApplication' },
    category: 'lead_gen',
    description: 'Application submitted',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  // ── Engagement ──
  {
    id: 'search',
    displayName: 'Search',
    names: { ga4: 'search', meta: 'Search', tiktok: 'Search' },
    category: 'engagement',
    description: 'Site search performed',
    requiredParams: [PARAM_SEARCH_TERM_GA4, PARAM_SEARCH_STRING_OTHER],
    commonParams: [],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'share',
    displayName: 'Share',
    names: { ga4: 'share' },
    category: 'engagement',
    description: 'Content shared',
    requiredParams: [],
    commonParams: [],
    defaultTrigger: 'click',
    defaultSelector: '',
  },
  {
    id: 'login',
    displayName: 'Login',
    names: { ga4: 'login' },
    category: 'engagement',
    description: 'User logged in',
    requiredParams: [],
    commonParams: [PARAM_METHOD],
    defaultTrigger: 'submit',
    defaultSelector: '',
  },
  {
    id: 'download',
    displayName: 'Download',
    names: { tiktok: 'Download' },
    category: 'engagement',
    description: 'File downloaded',
    requiredParams: [],
    commonParams: [],
    defaultTrigger: 'click',
    defaultSelector: '',
  },
  {
    id: 'find_location',
    displayName: 'Find Location',
    names: { meta: 'FindLocation' },
    category: 'engagement',
    description: 'Location searched',
    requiredParams: [],
    commonParams: [PARAM_CURRENCY, PARAM_VALUE],
    defaultTrigger: 'click',
    defaultSelector: '',
  },
];

// ── Helpers ──────────────────────────────────────────────────────

export function getStandardEvent(id: string): StandardEvent | undefined {
  return STANDARD_EVENTS.find((e) => e.id === id);
}

export function getEventsByCategory(category: EventCategory): StandardEvent[] {
  return STANDARD_EVENTS.filter((e) => e.category === category);
}

/** Returns only the standard events that have a name mapping for the given platform */
export function getEventsForPlatform(platform: Platform): StandardEvent[] {
  return STANDARD_EVENTS.filter((e) => e.names[platform] !== undefined);
}

/** Auto-formats a custom event name per platform convention */
export function formatEventName(name: string, convention: PlatformConfig['namingConvention']): string {
  const cleaned = name.trim();
  switch (convention) {
    case 'snake_case':
      return cleaned.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    case 'PascalCase':
      return cleaned.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'fixed':
      return 'conversion';
    case 'none':
      return '';
  }
}

/** Common ISO 4217 currency codes for the currency dropdown */
export const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF',
  'SEK', 'NOK', 'DKK', 'INR', 'BRL', 'MXN', 'ZAR', 'AED', 'KRW', 'TWD',
];
```

- [ ] **Step 2: Verify file compiles**

```bash
cd /Users/nnguy/pigxel/dashboard && npx tsc --noEmit dashboard/lib/platform-events.ts 2>&1 || echo "Check for errors"
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/lib/platform-events.ts
git commit -m "feat: add platform event data model with standard events catalog"
```

---

## Task 2: Event Normalization Utility

**Files:**
- Create: `dashboard/lib/normalize-event.ts`

- [ ] **Step 1: Create the normalizer**

This utility converts old-format events (`{ platform, event_name }`) to the new format (`{ platforms[], platformNames{}, params[] }`), and passes new-format events through unchanged.

```typescript
import type { Platform } from './platform-events';
import { STANDARD_EVENTS } from './platform-events';

// ── New EventRule shape ──────────────────────────────────────────

export interface EventParam {
  key: string;
  value: string | number | boolean;
  valueSource: 'static' | 'data_attribute' | 'css_selector' | 'json_ld';
  platforms?: Platform[];
  dynamicConfig?: {
    selector: string;
    transform: 'as_is' | 'strip_currency' | 'parse_number';
  };
}

export interface EventRule {
  id: string;
  displayName: string;
  eventType: 'standard' | 'custom';
  standardEventId?: string;
  platforms: Platform[];
  platformNames: Partial<Record<Platform, string>>;
  trigger: 'click' | 'submit' | 'pageview';
  selector: string;
  params: EventParam[];
  platformFields: {
    linkedin_conversion_id?: string;
    google_ads_conversion_id?: string;
    google_ads_conversion_label?: string;
  };
  description?: string;
  createdAt: string;
}

// ── Old shape (for migration) ────────────────────────────────────

interface LegacyEvent {
  selector?: string;
  trigger?: string;
  platform?: string;
  event_name?: string;
  google_ads_conversion_label?: string;
  linkedin_conversion_id?: string;
  description?: string;
  script?: string;
  // New fields (may already be present)
  id?: string;
  platforms?: Platform[];
  platformNames?: Partial<Record<Platform, string>>;
  params?: EventParam[];
  platformFields?: EventRule['platformFields'];
  displayName?: string;
  eventType?: 'standard' | 'custom';
}

// ── Normalization ────────────────────────────────────────────────

function expandPlatform(p: string): Platform[] {
  switch (p) {
    case 'both': return ['ga4', 'meta'];
    case 'all': return ['ga4', 'meta', 'tiktok', 'linkedin', 'google_ads'];
    default: return [p as Platform];
  }
}

function lookupPlatformNames(eventName: string, platforms: Platform[]): Partial<Record<Platform, string>> {
  // Try to find a matching standard event
  const std = STANDARD_EVENTS.find(
    (e) => e.id === eventName || Object.values(e.names).some((n) => n === eventName)
  );
  if (std) {
    const names: Partial<Record<Platform, string>> = {};
    for (const p of platforms) {
      if (std.names[p]) names[p] = std.names[p];
    }
    return names;
  }
  // Custom event — use the same name for all platforms
  const names: Partial<Record<Platform, string>> = {};
  for (const p of platforms) names[p] = eventName;
  return names;
}

export function normalizeEventRule(raw: LegacyEvent, index: number): EventRule {
  // Already new format
  if (raw.platforms && raw.platformNames) {
    return {
      id: raw.id || crypto.randomUUID(),
      displayName: raw.displayName || raw.event_name || raw.description || 'Event',
      eventType: raw.eventType || 'custom',
      standardEventId: raw.standardEventId,
      platforms: raw.platforms,
      platformNames: raw.platformNames,
      trigger: (raw.trigger as EventRule['trigger']) || 'click',
      selector: raw.selector || '',
      params: raw.params || [],
      platformFields: raw.platformFields || {},
      description: raw.description,
      createdAt: raw.createdAt || new Date().toISOString(),
    } as EventRule;
  }

  // Legacy format — migrate
  const platforms = expandPlatform(raw.platform || 'ga4');
  const eventName = raw.event_name || '';
  const platformNames = lookupPlatformNames(eventName, platforms);

  // Check if it's a known standard event
  const std = STANDARD_EVENTS.find(
    (e) => e.id === eventName || Object.values(e.names).some((n) => n === eventName)
  );

  return {
    id: crypto.randomUUID(),
    displayName: std?.displayName || raw.description || eventName,
    eventType: std ? 'standard' : 'custom',
    standardEventId: std?.id,
    platforms,
    platformNames,
    trigger: (raw.trigger as EventRule['trigger']) || 'click',
    selector: raw.selector || '',
    params: [],
    platformFields: {
      linkedin_conversion_id: raw.linkedin_conversion_id,
      google_ads_conversion_label: raw.google_ads_conversion_label,
    },
    description: raw.description,
    createdAt: new Date().toISOString(),
  };
}

/** Normalize an entire events array (from Firestore) */
export function normalizeEvents(events: LegacyEvent[]): EventRule[] {
  return (events || []).map((e, i) => normalizeEventRule(e, i));
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/lib/normalize-event.ts
git commit -m "feat: add event normalization utility for old-to-new format migration"
```

---

## Task 3: pigxel.js — Multi-Platform Firing & Parameters

**Files:**
- Modify: `pigxel.js`
- Copy to: `dashboard/public/pigxel.js`

- [ ] **Step 1: Add helper functions before `trackEvent()`**

Insert these helpers after the `handleError` function and before `extractScriptParams`:

```javascript
  // ── Parameter Helpers ──────────────────────────────────────────

  function applyTransform(raw, transform) {
    if (!transform || transform === 'as_is') return raw;
    if (transform === 'strip_currency' || transform === 'parse_number') {
      return parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
    }
    return raw;
  }

  function findDataAttribute(matchedEl, attrName) {
    var el = matchedEl;
    var depth = 0;
    while (el && el !== document.body && depth < 10) {
      var val = el.getAttribute(attrName);
      if (val !== null) return val;
      el = el.parentElement;
      depth++;
    }
    return null;
  }

  function extractJsonLd(path) {
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var data = JSON.parse(scripts[i].textContent || '{}');
        var parts = path.split('.');
        var val = data;
        for (var j = 0; j < parts.length; j++) {
          if (val == null) break;
          val = val[parts[j]];
        }
        if (val !== undefined && val !== null) return String(val);
      }
    } catch (e) { debugLog('JSON-LD extraction failed', e); }
    return null;
  }

  function buildParams(params, platform, platformFields, matchedEl) {
    var result = {};
    (params || []).forEach(function (p) {
      if (p.platforms && p.platforms.indexOf(platform) === -1) return;
      if (p.valueSource === 'css_selector' && p.dynamicConfig) {
        var el = document.querySelector(p.dynamicConfig.selector);
        var raw = el ? (el.textContent || el.value || '') : '';
        result[p.key] = applyTransform(raw, p.dynamicConfig.transform);
      } else if (p.valueSource === 'data_attribute' && p.dynamicConfig) {
        result[p.key] = applyTransform(
          findDataAttribute(matchedEl, p.dynamicConfig.selector) || '',
          p.dynamicConfig.transform
        );
      } else if (p.valueSource === 'json_ld' && p.dynamicConfig) {
        result[p.key] = applyTransform(
          extractJsonLd(p.dynamicConfig.selector) || '',
          p.dynamicConfig.transform
        );
      } else {
        result[p.key] = p.value;
      }
    });
    if (platform === 'linkedin' && platformFields && platformFields.linkedin_conversion_id) {
      result.conversion_id = parseInt(platformFields.linkedin_conversion_id, 10);
    }
    if (platform === 'google_ads' && platformFields && platformFields.google_ads_conversion_id && platformFields.google_ads_conversion_label) {
      result.send_to = 'AW-' + platformFields.google_ads_conversion_id + '/' + platformFields.google_ads_conversion_label;
    }
    return result;
  }
```

- [ ] **Step 2: Update `trackEvent()` to handle LinkedIn and Google Ads**

In the `trackEvent` function, add LinkedIn and Google Ads handlers after the TikTok block, and remove the `platform === 'both'` checks:

```javascript
  function trackEvent(platform, eventName, eventData) {
    eventData = eventData || {};
    try {
      debugLog('Forwarding event', { platform: platform, eventName: eventName });

      // 1. dataLayer (best — GTM routes it to all configured destinations)
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        window.dataLayer.push(
          Object.assign({ event: eventName, pigxel_platform: platform }, eventData)
        );
        debugLog('Event pushed to dataLayer', eventName);
        return;
      }

      // 2. Direct gtag call (GA4)
      if (platform === 'ga4' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventData);
        debugLog('Event sent via gtag', eventName);
      }

      // 3. Direct fbq call (Meta)
      if (platform === 'meta' && typeof window.fbq === 'function') {
        window.fbq('track', eventName, eventData);
        debugLog('Event sent via fbq', eventName);
      }

      // 4. TikTok
      if (platform === 'tiktok' && typeof window.ttq !== 'undefined') {
        window.ttq.track(eventName, eventData);
        debugLog('Event sent via ttq', eventName);
      }

      // 5. LinkedIn
      if (platform === 'linkedin' && typeof window.lintrk === 'function') {
        var convId = eventData.conversion_id;
        if (convId) {
          window.lintrk('track', { conversion_id: convId });
          debugLog('Event sent via lintrk', convId);
        }
      }

      // 6. Google Ads
      if (platform === 'google_ads' && typeof window.gtag === 'function') {
        var sendTo = eventData.send_to;
        if (sendTo) {
          window.gtag('event', 'conversion', {
            send_to: sendTo,
            value: eventData.value,
            currency: eventData.currency,
            transaction_id: eventData.transaction_id
          });
          debugLog('Google Ads conversion sent', sendTo);
        }
      }

    } catch (error) {
      handleError(error, 'trackEvent(' + platform + ', ' + eventName + ')');
    }
  }
```

- [ ] **Step 3: Update `handleDOMEvent()` for multi-platform firing**

Replace the tracking calls inside `handleDOMEvent` to iterate over `platforms[]`:

Find the block inside the `config.events.forEach` callback where `trackEvent` is called and replace with:

```javascript
        if (matchedElement) {
          debugLog('DOM event matched', {
            selector: eventConfig.selector,
            trigger: eventConfig.trigger,
          });

          var platforms = eventConfig.platforms || [eventConfig.platform];

          function fireAll() {
            platforms.forEach(function (p) {
              var name = (eventConfig.platformNames && eventConfig.platformNames[p]) || eventConfig.event_name;
              var params = buildParams(eventConfig.params || [], p, eventConfig.platformFields || {}, matchedElement);
              trackEvent(p, name, params);
            });
          }

          if (eventType === 'submit') {
            event.preventDefault();
            fireAll();
            setTimeout(function () {
              if (typeof matchedElement.requestSubmit === 'function') {
                matchedElement.requestSubmit();
              } else if (typeof matchedElement.submit === 'function') {
                matchedElement.submit();
              }
            }, 150);
          } else {
            fireAll();
          }
        }
```

- [ ] **Step 4: Update `checkURLRules()` for multi-platform firing**

In `checkURLRules`, replace the single `trackEvent` call with multi-platform iteration:

```javascript
        if (href.includes(pattern) || pathname.includes(pattern)) {
          debugLog('URL rule matched', { pattern: pattern, event: eventConfig.event_name });
          var platforms = eventConfig.platforms || [eventConfig.platform];
          platforms.forEach(function (p) {
            var name = (eventConfig.platformNames && eventConfig.platformNames[p]) || eventConfig.event_name;
            var params = buildParams(eventConfig.params || [], p, eventConfig.platformFields || {}, null);
            trackEvent(p, name, params);
          });
        }
```

- [ ] **Step 5: Sync and commit**

```bash
cp pigxel.js dashboard/public/pigxel.js
git add pigxel.js dashboard/public/pigxel.js
git commit -m "feat: pigxel.js multi-platform firing, parameters, LinkedIn/Google Ads support"
```

---

## Task 4: Redesigned Add Event Modal

**Files:**
- Rewrite: `dashboard/components/dashboard/add-event-modal.tsx`
- Create: `dashboard/components/dashboard/event-param-field.tsx`

This is the largest task. The modal is a full rewrite. Since the file is 674 lines, replace the entire component.

- [ ] **Step 1: Create the param field component**

Create `dashboard/components/dashboard/event-param-field.tsx` — a reusable parameter input that handles currency dropdowns, number inputs, string inputs, and string array (tags) inputs. It also has the static/dynamic toggle for number fields (dynamic value mapping comes in Task 7, just the static input for now).

The component receives a `ParamDef` and renders the appropriate input. Export as `EventParamField`.

- [ ] **Step 2: Rewrite the add-event modal**

Rewrite `dashboard/components/dashboard/add-event-modal.tsx` with:

**Step 1 of modal:**
- Event type toggle: Standard | Custom
- Standard: searchable dropdown grouped by category, populates platform names
- Custom: freeform name input with auto-formatting hints
- Platform checkboxes with inline extra fields (LinkedIn Conversion ID, Google Ads ID + Label)
- Platform names preview (collapsible)

**Step 2 of modal:**
- Trigger selection (unchanged: text match / URL match / CSS selector)
- Parameters section: required params (from standard event), common params (collapsible), + Add parameter button
- Uses `EventParamField` for each parameter
- Preview button placeholder (Task 8)
- Submit creates new `EventRule` with `crypto.randomUUID()` ID

**Key changes from current:**
- Imports `STANDARD_EVENTS`, `PLATFORMS`, `getPlatform`, `formatEventName`, `CURRENCY_CODES` from `platform-events.ts`
- Imports `EventRule`, `EventParam` from `normalize-event.ts`
- No more `suggestGA4Event` / `suggestTikTokEvent` inline functions
- Saves the new `EventRule` shape to Firestore

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/dashboard/add-event-modal.tsx dashboard/components/dashboard/event-param-field.tsx
git commit -m "feat: redesigned add-event modal with platform-aware standard/custom events"
```

---

## Task 5: Update Event Rules List & Events Page

**Files:**
- Modify: `dashboard/components/dashboard/event-rules-list.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/events/page.tsx`
- Modify: `dashboard/components/dashboard/event-chat.tsx`

- [ ] **Step 1: Update event-rules-list.tsx**

Update to read the new `EventRule` shape:
- Show `displayName` instead of `event_name`
- Show multiple platform badges (iterate `platforms[]`)
- Show parameter count if > 0
- Flag events with empty selectors as "Needs configuration"
- Delete by `id` instead of array index

Import `normalizeEvents` from `normalize-event.ts` and normalize events before rendering.

- [ ] **Step 2: Update events page**

In `events/page.tsx`:
- Import `normalizeEvents` and normalize on Firestore read
- Switch filter tabs from `"both" | "all"` to per-platform filtering against `platforms[]` array
- Switch `handleDelete` from index-based to ID-based: find event by ID, filter it out, save
- Switch `handleAddEvent` to work with new `EventRule` shape

- [ ] **Step 3: Update event-chat.tsx**

Add a `chatDraftToEventRule()` mapper that converts the `EventDraft` from the AI chat to the new `EventRule` shape before saving to Firestore. The mapper:
- Expands `platform: "both"` → `platforms: ['ga4', 'meta']`
- Looks up standard event to populate `platformNames`
- Generates a UUID for `id`
- Maps `google_ads_conversion_label` / `linkedin_conversion_id` to `platformFields`

- [ ] **Step 4: Commit**

```bash
git add dashboard/components/dashboard/event-rules-list.tsx dashboard/app/dashboard/[siteId]/events/page.tsx dashboard/components/dashboard/event-chat.tsx
git commit -m "feat: update events page and rules list for new EventRule shape"
```

---

## Task 6: Event Templates

**Files:**
- Create: `dashboard/lib/event-templates.ts`
- Create: `dashboard/components/dashboard/template-picker.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/events/page.tsx`

- [ ] **Step 1: Create event-templates.ts**

```typescript
import type { Platform } from './platform-events';
import { getStandardEvent } from './platform-events';
import type { EventRule } from './normalize-event';

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  eventIds: string[];  // StandardEvent.id references
}

export const TEMPLATES: EventTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce Starter',
    description: 'Track purchases, cart actions, and product views',
    icon: 'ShoppingCart',
    eventIds: ['purchase', 'add_to_cart', 'view_item', 'begin_checkout', 'add_payment_info'],
  },
  {
    id: 'lead_gen',
    name: 'Lead Generation',
    description: 'Track form submissions, signups, and contact requests',
    icon: 'UserPlus',
    eventIds: ['generate_lead', 'sign_up', 'contact'],
  },
  {
    id: 'saas',
    name: 'SaaS / Free Trial',
    description: 'Track signups, trials, and subscriptions',
    icon: 'Rocket',
    eventIds: ['sign_up', 'start_trial', 'purchase', 'subscribe'],
  },
  {
    id: 'content',
    name: 'Content & Engagement',
    description: 'Track searches, views, shares, and downloads',
    icon: 'FileText',
    eventIds: ['search', 'view_item', 'share', 'download'],
  },
  {
    id: 'restaurant',
    name: 'Restaurant / Booking',
    description: 'Track contact, location searches, and bookings',
    icon: 'MapPin',
    eventIds: ['contact', 'find_location', 'purchase'],
  },
];

/** Create EventRule[] from a template + selected platforms */
export function createEventsFromTemplate(
  template: EventTemplate,
  platforms: Platform[],
  platformFields: EventRule['platformFields'],
): EventRule[] {
  return template.eventIds
    .map((eventId) => {
      const std = getStandardEvent(eventId);
      if (!std) return null;

      const platformNames: Partial<Record<Platform, string>> = {};
      const activePlatforms: Platform[] = [];
      for (const p of platforms) {
        if (std.names[p]) {
          platformNames[p] = std.names[p]!;
          activePlatforms.push(p);
        }
      }
      if (activePlatforms.length === 0) return null;

      return {
        id: crypto.randomUUID(),
        displayName: std.displayName,
        eventType: 'standard' as const,
        standardEventId: std.id,
        platforms: activePlatforms,
        platformNames,
        trigger: std.defaultTrigger,
        selector: std.defaultSelector,
        params: [],
        platformFields,
        createdAt: new Date().toISOString(),
      };
    })
    .filter(Boolean) as EventRule[];
}
```

- [ ] **Step 2: Create template-picker.tsx**

A component with:
- Horizontal scrollable row of template cards (only shows when < 3 events exist)
- Each card shows icon, name, description, event count
- Clicking opens a modal with:
  - Checklist of events in the template (all checked by default)
  - Platform multi-select checkboxes
  - LinkedIn/Google Ads fields (prompted once, shared across all events)
  - "Add all" button → calls `createEventsFromTemplate()` and saves to Firestore

- [ ] **Step 3: Add template picker to events page**

In `events/page.tsx`, import `TemplatePicker` and render it at the top of the Builder tab, passing the current event count and a save callback.

- [ ] **Step 4: Commit**

```bash
git add dashboard/lib/event-templates.ts dashboard/components/dashboard/template-picker.tsx dashboard/app/dashboard/[siteId]/events/page.tsx
git commit -m "feat: add event template bundles with industry-specific presets"
```

---

## Task 7: Dynamic Value Mapping

**Files:**
- Create: `dashboard/components/dashboard/dynamic-value-config.tsx`
- Modify: `dashboard/components/dashboard/event-param-field.tsx`

- [ ] **Step 1: Create dynamic-value-config.tsx**

A small component that renders when a number parameter is toggled to "Dynamic":
- Source dropdown: Data attribute | CSS selector | JSON-LD path
- Selector/path text input (with appropriate placeholder per source)
- Transform dropdown: As-is | Strip currency symbols | Parse number
- Returns a `dynamicConfig` object

- [ ] **Step 2: Update event-param-field.tsx**

Add the Static/Dynamic toggle to number-type parameter fields. When "Dynamic" is selected, render `DynamicValueConfig` instead of the number input. Store the result in the `EventParam.dynamicConfig` field.

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/dashboard/dynamic-value-config.tsx dashboard/components/dashboard/event-param-field.tsx
git commit -m "feat: add dynamic value mapping for event parameters"
```

---

## Task 8: Event Preview Panel

**Files:**
- Create: `dashboard/components/dashboard/event-preview-panel.tsx`
- Modify: `dashboard/components/dashboard/add-event-modal.tsx`

- [ ] **Step 1: Create event-preview-panel.tsx**

A modal/slide-out that receives an `EventRule` and the site's `trackingConfig.pixels` and renders:

1. **Per-platform code blocks** — Generated firing syntax for each selected platform:
   - GA4: `gtag('event', 'purchase', { currency: 'USD', value: 99.99 });`
   - Meta: `fbq('track', 'Purchase', { currency: 'USD', value: 99.99 });`
   - TikTok: `ttq.track('Purchase', { currency: 'USD', value: 99.99 });`
   - LinkedIn: `lintrk('track', { conversion_id: 12345 });`
   - Google Ads: `gtag('event', 'conversion', { send_to: 'AW-123/abc' });`

2. **Validation checklist** with green/amber/red indicators:
   - Required params filled
   - Platform IDs present
   - Pixels connected (cross-check `trackingConfig.pixels`)
   - Dynamic values flagged

3. **Copy script button**

Code generation is a pure function `generateScript(event: EventRule, platform: Platform): string` — no network calls.

- [ ] **Step 2: Add Preview button to add-event modal**

In the modal's Step 2, add a "Preview" button that opens `EventPreviewPanel` with the current form state. Enabled when all required fields are filled.

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/dashboard/event-preview-panel.tsx dashboard/components/dashboard/add-event-modal.tsx
git commit -m "feat: add event preview panel with per-platform script generation"
```

---

## Task 9: Deploy & Sync

**Files:**
- Sync: `pigxel.js` → `dashboard/public/pigxel.js`

- [ ] **Step 1: Final sync and push**

```bash
cp pigxel.js dashboard/public/pigxel.js
git add .
git push origin main
```

- [ ] **Step 2: Deploy**

```bash
firebase deploy --only hosting
```

- [ ] **Step 3: Verify deployed pigxel.js has new handlers**

```bash
curl -s "https://pixie-b5d33.web.app/pigxel.js" | grep "lintrk\|google_ads\|buildParams"
```

Expected: matches for all three patterns.
