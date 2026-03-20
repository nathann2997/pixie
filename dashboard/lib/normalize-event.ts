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
  // New fields (may already be present if re-saved)
  id?: string;
  platforms?: Platform[];
  platformNames?: Partial<Record<Platform, string>>;
  params?: EventParam[];
  platformFields?: EventRule['platformFields'];
  displayName?: string;
  eventType?: 'standard' | 'custom';
  standardEventId?: string;
  createdAt?: string;
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
  const names: Partial<Record<Platform, string>> = {};
  for (const p of platforms) names[p] = eventName;
  return names;
}

export function normalizeEventRule(raw: LegacyEvent, index: number): EventRule {
  // Already new format — pass through
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
    };
  }

  // Legacy format — migrate
  const platforms = expandPlatform(raw.platform || 'ga4');
  const eventName = raw.event_name || '';
  const platformNames = lookupPlatformNames(eventName, platforms);

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
