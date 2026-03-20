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

export function getEventsForPlatform(platform: Platform): StandardEvent[] {
  return STANDARD_EVENTS.filter((e) => e.names[platform] !== undefined);
}

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

export const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF',
  'SEK', 'NOK', 'DKK', 'INR', 'BRL', 'MXN', 'ZAR', 'AED', 'KRW', 'TWD',
];
