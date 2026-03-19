/**
 * Pigxel Cloud Functions
 * Serves tracking configuration to client-side pigxel.js
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { chromium } from 'playwright-core';
import chromiumBin from '@sparticuz/chromium';
import * as fs from 'fs';

// ── AI Suite ──────────────────────────────────────────────────────────────────
export { scrapeAndMinifyUrl }   from './ai/scrapeUrl';
export { analyzeWebsiteWithAI } from './ai/analyzeWebsite';
export { generateTrackingPlan } from './ai/generatePlan';
export { updateDraftPlan }      from './ai/updateDraftPlan';
export { applyTrackingConfig }  from './ai/applyConfig';
export { eventBuilderChat }     from './ai/eventBuilderChat';

// Candidate paths for a local Chrome/Chromium install (macOS + Linux)
const LOCAL_CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findLocalChrome(): string | null {
  return LOCAL_CHROME_CANDIDATES.find((p) => fs.existsSync(p)) ?? null;
}

/**
 * Returns browser launch options appropriate for the current environment.
 * - Emulator / local dev: use system Chrome (avoids @sparticuz/chromium
 *   Linux binary which cannot execute on macOS).
 * - Production Cloud Functions: use the Lambda-optimised @sparticuz/chromium.
 */
async function getBrowserLaunchOptions(): Promise<{
  executablePath: string;
  args: string[];
  headless: boolean;
}> {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  if (isEmulator) {
    const localPath = findLocalChrome();
    if (!localPath) {
      throw new Error(
        'No local Chrome/Chromium found. Install Google Chrome or Chromium to use Scan in the emulator.'
      );
    }
    functions.logger.info('Using local Chrome for emulator scan', { executablePath: localPath });
    return {
      executablePath: localPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    };
  }

  // Production: use Lambda-optimised binary
  return {
    executablePath: await chromiumBin.executablePath(),
    args: chromiumBin.args,
    headless: true,
  };
}

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/** Conversion-intent keywords for filtering scraped elements */
const CONVERSION_KEYWORDS = [
  'buy', 'add', 'sign', 'join', 'contact', 'book',
  'purchase', 'subscribe', 'register', 'get started',
  'try', 'checkout', 'order', 'download', 'claim',
  'free trial', 'request demo',
];

/**
 * Audit data reported by pigxel.js running on the client's site
 */
interface PixelAudit {
  detected_pixels: string[];
  detected_scripts: string[];
  has_data_layer: boolean;
  data_layer_healthy: boolean;
  data_layer_events: string[];
  gtag_id: string | null;
  gtm_id: string | null;
  fbq_id: string | null;
  ttq_present: boolean;
  linkedin_present: boolean;
  pinterest_present: boolean;
  script_installed: boolean;
  audit_timestamp: string;
  page_url: string;
}

/**
 * Site document structure in Firestore
 */
interface SiteDocument {
  owner_id: string;
  url: string;
  status: 'pending' | 'active' | 'paused';
  trackingConfig: TrackingConfig;
  pixel_audit?: PixelAudit;
  created_at?: admin.firestore.Timestamp;
  updated_at?: admin.firestore.Timestamp;
}

/**
 * Tracking configuration structure
 */
interface TrackingConfig {
  pixels: {
    ga4?: string;
    meta?: string;
  };
  events: TrackingEvent[];
}

/**
 * Individual tracking event
 */
interface TrackingEvent {
  selector: string;
  trigger: 'click' | 'submit';
  platform: 'ga4' | 'meta';
  event_name: string;
  event_data?: Record<string, any>;
}

/**
 * Response structure for paused/pending sites
 */
interface PausedResponse {
  status: 'pending' | 'paused';
  pixels: Record<string, never>;
  events: never[];
}

/**
 * Response structure for active sites
 */
interface ActiveResponse extends TrackingConfig {
  status: 'active';
}

/**
 * GET /getSiteConfig?id={siteId}
 * 
 * Fetches tracking configuration for a site based on its status.
 * 
 * Status Handling (Safety Switch):
 * - 'pending' or 'paused': Returns empty config (script installed but not tracking)
 * - 'active': Returns full tracking configuration
 * 
 * @param req - HTTP request with 'id' query parameter
 * @param res - HTTP response with tracking config or error
 */
export const getSiteConfig = functions.https.onRequest(
  {
    // CORS must allow all origins — pigxel.js runs on client websites
    cors: true,
    region: 'us-central1',
  },
  async (req, res) => {
    // Set cache headers for performance
    // 5 minutes browser cache, 10 minutes CDN cache
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.set('Content-Type', 'application/json');

    try {
      // Extract site ID from query parameter
      const siteId = req.query.id as string;

      // Validate site ID
      if (!siteId) {
        functions.logger.warn('Missing site ID parameter');
        res.status(400).json({
          error: 'Missing required parameter: id',
          message: 'Please provide a site ID via ?id=YOUR_SITE_ID',
        });
        return;
      }

      // Validate site ID format (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9-_]+$/.test(siteId)) {
        functions.logger.warn('Invalid site ID format', { siteId });
        res.status(400).json({
          error: 'Invalid site ID format',
          message: 'Site ID must contain only letters, numbers, hyphens, and underscores',
        });
        return;
      }

      functions.logger.info('Fetching config for site', { siteId });

      // Fetch site document from Firestore
      const siteRef = db.collection('sites').doc(siteId);
      const siteDoc = await siteRef.get();

      // Check if site exists
      if (!siteDoc.exists) {
        functions.logger.warn('Site not found', { siteId });
        res.status(404).json({
          error: 'Site not found',
          message: `No configuration found for site ID: ${siteId}`,
        });
        return;
      }

      // Get site data
      const siteData = siteDoc.data() as SiteDocument;

      // Optional origin check — log mismatches for monitoring but don't block
      // (pigxel.js may be loaded in dev environments, iframes, etc.)
      try {
        const origin = (req.headers.origin || req.headers.referer || '') as string;
        const siteUrl = siteData.url || '';
        if (origin && siteUrl) {
          const expectedHost = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).hostname;
          if (!origin.includes(expectedHost)) {
            functions.logger.warn('Origin mismatch', { siteId, origin, expectedHost });
          }
        }
      } catch {
        // Malformed URL in site config — don't crash the request
      }

      const { status, trackingConfig } = siteData;

      functions.logger.info('Site found', { siteId, status });

      // Safety Switch: Check site status
      if (status === 'pending' || status === 'paused') {
        // Return empty config - script won't crash but won't track
        const pausedResponse: PausedResponse = {
          status: status,
          pixels: {},
          events: [],
        };

        functions.logger.info('Returning paused config', { siteId, status });
        res.status(200).json(pausedResponse);
        return;
      }

      // Status is 'active' - return full tracking configuration
      if (status === 'active') {
        const activeResponse: ActiveResponse = {
          status: 'active',
          ...trackingConfig,
        };

        functions.logger.info('Returning active config', {
          siteId,
          pixelCount: Object.keys(trackingConfig.pixels).length,
          eventCount: trackingConfig.events.length,
        });

        res.status(200).json(activeResponse);
        return;
      }

      // Invalid status value
      functions.logger.error('Invalid site status', { siteId, status });
      res.status(500).json({
        error: 'Invalid site configuration',
        message: 'Site has an invalid status value',
      });
    } catch (error) {
      // Log error and return 500
      functions.logger.error('Error fetching site config', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while fetching the configuration',
      });
    }
  }
);

/**
 * Suggested conversion point from site scan
 */
export interface SuggestedEvent {
  selector: string;
  text: string;
  type: 'button' | 'submit' | 'link';
}

/**
 * scanSite callable (Gen 2)
 * Launches Playwright (headless Chromium), navigates to url,
 * waits for network idle, scrapes conversion-like elements,
 * writes suggested_events to sites/{siteId}, returns success.
 */
export const scanSite = functions.https.onCall(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  async (request): Promise<{ success: true; count: number }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in to scan a site.');
    }

    const { siteId, url } = request.data as { siteId?: string; url?: string };
    if (!siteId || !url) {
      throw new HttpsError('invalid-argument', 'Missing siteId or url.');
    }

    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();
    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found.');
    }
    const siteData = siteDoc.data() as SiteDocument;
    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not allowed to scan this site.');
    }

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const suggested: SuggestedEvent[] = [];
    let browser = null;

    try {
      functions.logger.info('Launching Playwright', { targetUrl });

      const launchOptions = await getBrowserLaunchOptions();
      browser = await chromium.launch(launchOptions);

      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': 'Pigxel-Scanner/1.0' });

      // Block external resources that are irrelevant for DOM scanning and
      // would prevent networkidle from resolving (analytics pixels, ad scripts,
      // fonts, images, media).  The scanner only needs the HTML + inline JS.
      await page.route('**/*', async (route) => {
        const type = route.request().resourceType();
        const reqUrl = route.request().url();

        const BLOCKED_DOMAINS = [
          'googletagmanager.com',
          'google-analytics.com',
          'analytics.google.com',
          'connect.facebook.net',
          'facebook.com/tr',
          'doubleclick.net',
          'googlesyndication.com',
          'tiktok.com',
          'snap.com',
          'clarity.ms',
          'hotjar.com',
          'intercom.io',
          'crisp.chat',
        ];

        if (
          type === 'image' ||
          type === 'media' ||
          type === 'font' ||
          type === 'stylesheet' ||
          BLOCKED_DOMAINS.some((d) => reqUrl.includes(d))
        ) {
          await route.abort();
          return;
        }

        await route.continue();
      });

      // domcontentloaded is reliable — HTML + synchronous JS is parsed.
      // We add a short extra wait so any defer/async scripts have time to run.
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      // Scrape buttons, submit inputs, and a.btn anchor elements
      const rawElements = await page.evaluate((keywords: string[]) => {
        const results: Array<{ selector: string; text: string; type: 'button' | 'submit' | 'link' }> = [];
        const seen = new Set<string>();

        function looksLikeConversion(text: string): boolean {
          const lower = text.toLowerCase().trim();
          return keywords.some((kw) => lower.includes(kw));
        }

        function buildSelector(el: Element): string {
          const tag = el.tagName.toLowerCase();
          if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return `#${el.id}`;
          const classes = Array.from(el.classList).slice(0, 2);
          if (classes.length) return `${tag}.${classes.join('.')}`;
          return tag;
        }

        function processEl(el: Element, type: 'button' | 'submit' | 'link') {
          const text = (el.textContent || (el as HTMLInputElement).value || '').trim().slice(0, 80);
          if (!text || !looksLikeConversion(text)) return;
          const selector = buildSelector(el);
          const key = `${selector}::${text}`;
          if (seen.has(key)) return;
          seen.add(key);
          results.push({ selector, text, type });
        }

        document.querySelectorAll('button').forEach((el) => processEl(el, 'button'));
        document.querySelectorAll('input[type="submit"]').forEach((el) => processEl(el, 'submit'));
        document.querySelectorAll('a.btn, a.button, a[class*="btn"]').forEach((el) => processEl(el, 'link'));

        return results;
      }, CONVERSION_KEYWORDS);

      suggested.push(...rawElements);
    } catch (err) {
      functions.logger.warn('Playwright scan failed', { targetUrl, err: String(err) });
      throw new HttpsError(
        'internal',
        `Could not scan the page: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      if (browser) await browser.close();
    }

    await siteRef.update({
      suggested_events: suggested,
      updated_at: FieldValue.serverTimestamp(),
    });

    functions.logger.info('scanSite completed', { siteId, count: suggested.length });
    return { success: true, count: suggested.length };
  }
);

/**
 * POST /reportAudit?id={siteId}
 *
 * Receives the pixel audit payload from pigxel.js running on the client's site.
 * Writes findings to sites/{siteId}.pixel_audit in Firestore.
 * No authentication — pigxel.js runs on third-party domains.
 */
export const reportAudit = functions.https.onRequest(
  {
    // CORS must allow all origins — pigxel.js runs on client websites
    cors: true,
    region: 'us-central1',
  },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Payload size guard — check Content-Length header before processing
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 10_000) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }

    // Rate-limit hints for CDN enforcement (e.g., Cloudflare)
    res.set('X-RateLimit-Limit', '60');
    res.set('X-RateLimit-Window', '60');

    try {
      const siteId = req.query.id as string;

      if (!siteId || !/^[a-zA-Z0-9-_]+$/.test(siteId)) {
        res.status(400).json({ error: 'Missing or invalid site ID' });
        return;
      }

      const siteRef = db.collection('sites').doc(siteId);
      const siteDoc = await siteRef.get();

      if (!siteDoc.exists) {
        res.status(404).json({ error: 'Site not found' });
        return;
      }

      const body = req.body as Partial<PixelAudit>;

      const MAX_ARRAY_LEN = 20;

      // Validate basic shape — ignore unknown fields
      const audit: PixelAudit = {
        detected_pixels:   Array.isArray(body.detected_pixels)   ? body.detected_pixels.slice(0, MAX_ARRAY_LEN)   : [],
        detected_scripts:  Array.isArray(body.detected_scripts)  ? body.detected_scripts.slice(0, MAX_ARRAY_LEN)  : [],
        has_data_layer:    typeof body.has_data_layer    === 'boolean' ? body.has_data_layer    : false,
        data_layer_healthy:typeof body.data_layer_healthy=== 'boolean' ? body.data_layer_healthy: false,
        data_layer_events: Array.isArray(body.data_layer_events) ? body.data_layer_events.slice(0, MAX_ARRAY_LEN) : [],
        gtag_id:           typeof body.gtag_id    === 'string' ? body.gtag_id    : null,
        gtm_id:            typeof body.gtm_id     === 'string' ? body.gtm_id     : null,
        fbq_id:            typeof body.fbq_id     === 'string' ? body.fbq_id     : null,
        ttq_present:       typeof body.ttq_present       === 'boolean' ? body.ttq_present       : false,
        linkedin_present:  typeof body.linkedin_present  === 'boolean' ? body.linkedin_present  : false,
        pinterest_present: typeof body.pinterest_present === 'boolean' ? body.pinterest_present : false,
        script_installed:  true, // If pigxel.js is calling this, it's installed
        audit_timestamp:   typeof body.audit_timestamp === 'string' ? body.audit_timestamp : new Date().toISOString(),
        page_url: typeof body.page_url === 'string'
          ? body.page_url.replace(/[<>"']/g, '').slice(0, 512)
          : '',
      };

      await siteRef.update({
        pixel_audit: audit,
        updated_at: FieldValue.serverTimestamp(),
      });

      functions.logger.info('Audit stored', { siteId, detected: audit.detected_pixels });
      res.status(200).json({ ok: true });
    } catch (error) {
      functions.logger.error('reportAudit error', { error: String(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Health check endpoint
 */
export const healthCheck = functions.https.onRequest(
  {
    cors: ['https://pixie-b5d33.web.app', 'http://localhost:3000'],
    region: 'us-central1',
  },
  async (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'pigxel-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }
);
