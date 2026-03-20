import type { Platform } from './platform-events';
import { getStandardEvent } from './platform-events';
import type { EventRule } from './normalize-event';

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  eventIds: string[];
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
