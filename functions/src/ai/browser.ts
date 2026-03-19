/**
 * Shared browser helpers for the Pigxel AI pipeline.
 * Re-used by scrapeUrl, analyzeWebsite, and any future Playwright functions.
 */

import * as functions from 'firebase-functions/v2';
import { chromium } from 'playwright-core';
import chromiumBin from '@sparticuz/chromium';
import * as fs from 'fs';

// ─── Chrome discovery ─────────────────────────────────────────────────────────

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

export async function getBrowserLaunchOptions(): Promise<{
  executablePath: string;
  args: string[];
  headless: boolean;
}> {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const localPath = findLocalChrome();
    if (!localPath) {
      throw new Error(
        'No local Chrome/Chromium found. Install Google Chrome to use AI features in the emulator.'
      );
    }
    functions.logger.info('[browser] Using local Chrome', { executablePath: localPath });
    return {
      executablePath: localPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    };
  }
  return {
    executablePath: await chromiumBin.executablePath(),
    args: chromiumBin.args,
    headless: true,
  };
}

// ─── Domains blocked during scraping (analytics/ads slow things down) ────────

export const BLOCKED_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'connect.facebook.net',
  'doubleclick.net',
  'googlesyndication.com',
  'tiktok.com',
  'hotjar.com',
  'intercom.io',
  'clarity.ms',
];

/**
 * Sets up route blocking for a Playwright page.
 * For external callers (like scanSite) that manage their own browser.
 * Internal functions (scrapeAndMinify, scrapeAndAudit) keep their own inline blocking.
 * @param blockStylesheets - true for scan-only operations, false for AI scraping
 */
export async function setupRouteBlocking(
  page: import('playwright-core').Page,
  blockStylesheets = false,
): Promise<void> {
  await page.route('**/*', async (route) => {
    const type = route.request().resourceType();
    const url  = route.request().url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      (blockStylesheets && type === 'stylesheet') ||
      BLOCKED_DOMAINS.some((d) => url.includes(d))
    ) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

// ─── Core scrape utility ─────────────────────────────────────────────────────

export interface ScrapedPage {
  title: string;
  minifiedHtml: string;
}

export interface AuditEnvironment {
  pixels: { ga4: boolean; meta: boolean; tiktok: boolean; linkedin: boolean; google_ads: boolean };
  datalayerPresent: boolean;
  datalayerEvents: string[];
  isSpa: boolean;
  frameworkDetected: string;
  consentPlatform: string;
  jsonLdContent: string | null;
}

export interface AuditedPage extends ScrapedPage {
  environment: AuditEnvironment;
}

const STRIP_TAGS = [
  'script', 'style', 'svg', 'img', 'iframe',
  'video', 'audio', 'noscript', 'link', 'meta', 'head',
] as const;

const KEEP_ATTRS = new Set([
  'id', 'class', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'name', 'type', 'placeholder', 'href', 'action', 'method', 'for', 'value', 'alt',
]);

/**
 * Launch Playwright, navigate to a URL, strip non-semantic DOM noise, and
 * return the page title plus a heavily minified HTML string.
 */
export async function scrapeAndMinify(targetUrl: string): Promise<ScrapedPage> {
  const launchOptions = await getBrowserLaunchOptions();
  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();

    await page.route('**/*', async (route) => {
      const type = route.request().resourceType();
      const url  = route.request().url();
      if (
        type === 'image' || type === 'media' || type === 'font' ||
        BLOCKED_DOMAINS.some((d) => url.includes(d))
      ) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await page.waitForTimeout(2000);

    const { title, rawHtml } = await page.evaluate(
      (opts: { stripTags: string[]; keepAttrs: string[] }) => {
        opts.stripTags.forEach((tag) => {
          document.querySelectorAll(tag).forEach((el) => el.remove());
        });

        function removeComments(node: Node): void {
          node.childNodes.forEach((child) => {
            if (child.nodeType === Node.COMMENT_NODE) {
              node.removeChild(child);
            } else {
              removeComments(child);
            }
          });
        }
        removeComments(document.body);

        const keepSet = new Set(opts.keepAttrs);
        document.body.querySelectorAll('*').forEach((el) => {
          Array.from(el.attributes)
            .map((a) => a.name)
            .filter((n) => !keepSet.has(n) && !n.startsWith('aria-'))
            .forEach((attr) => el.removeAttribute(attr));
        });

        return { title: document.title ?? '', rawHtml: document.body.innerHTML };
      },
      { stripTags: [...STRIP_TAGS], keepAttrs: [...KEEP_ATTRS] }
    );

    const minifiedHtml = rawHtml
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .replace(/^ +| +$/gm, '')
      .trim();

    return { title, minifiedHtml };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Like scrapeAndMinify, but also:
 * - Detects pixels, SPA framework, dataLayer events, and consent platforms at runtime
 * - Preserves data-* attributes in the HTML (valuable for selector generation)
 * Returns both the minified HTML and a structured environment snapshot.
 */
export async function scrapeAndAudit(targetUrl: string): Promise<AuditedPage> {
  const launchOptions = await getBrowserLaunchOptions();
  const browser       = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();

    await page.route('**/*', async (route) => {
      const type = route.request().resourceType();
      const url  = route.request().url();
      if (
        type === 'image' || type === 'media' || type === 'font' ||
        BLOCKED_DOMAINS.some((d) => url.includes(d))
      ) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await page.waitForTimeout(2500); // slightly longer — allow pixel scripts to initialise

    // ── Step 1: Detect runtime environment BEFORE any DOM manipulation ────────
    const environment = await page.evaluate((): AuditEnvironment => {
      const w = window as unknown as Record<string, unknown>;

      const dl: Array<Record<string, unknown>> = Array.isArray(w['dataLayer'])
        ? (w['dataLayer'] as Array<Record<string, unknown>>)
        : [];

      const ldEl = document.querySelector('script[type="application/ld+json"]');

      return {
        pixels: {
          ga4:        typeof w['gtag']   === 'function',
          meta:       typeof w['fbq']    === 'function',
          tiktok:     typeof w['ttq']    !== 'undefined',
          linkedin:   typeof w['lintrk'] === 'function',
          google_ads: (function() {
            // Google Ads shares gtag.js with GA4 but uses AW- prefixed config
            // Detect via dataLayer config calls or script src containing AW-
            const dl: Array<unknown> = Array.isArray(w['dataLayer']) ? (w['dataLayer'] as Array<unknown>) : [];
            const hasAwConfig = dl.some(function(entry) {
              return Array.isArray(entry) && entry[0] === 'config' && typeof entry[1] === 'string' && (entry[1] as string).startsWith('AW-');
            });
            if (hasAwConfig) return true;
            const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
            return scripts.some(function(s) { return s.src && s.src.includes('AW-'); });
          })(),
        },
        datalayerPresent: dl.length > 0,
        datalayerEvents: dl
          .map((e) => (typeof e['event'] === 'string' ? e['event'] : ''))
          .filter(Boolean)
          .slice(0, 30),
        isSpa: !!(
          document.querySelector('#__next') ||
          document.querySelector('[data-reactroot]') ||
          w['__NEXT_DATA__'] ||
          w['__NUXT__'] ||
          document.querySelector('#app[data-v-app]')
        ),
        frameworkDetected:
          w['__NEXT_DATA__'] ? 'Next.js' :
          document.querySelector('#__next') ? 'Next.js' :
          w['__NUXT__'] ? 'Nuxt.js' :
          document.querySelector('[data-reactroot]') ? 'React' :
          document.querySelector('#app') ? 'Vue/React' : 'Unknown',
        consentPlatform:
          w['OneTrust'] || document.querySelector('#onetrust-consent-sdk') ? 'OneTrust' :
          w['Cookiebot'] || document.querySelector('#CybotCookiebotDialog') ? 'Cookiebot' : 'None',
        jsonLdContent: ldEl ? ldEl.textContent : null,
      };
    });

    // ── Step 2: Strip and minify HTML, keeping data-* for selector candidates ─
    const { title, rawHtml } = await page.evaluate(
      (opts: { stripTags: string[]; keepAttrs: string[] }) => {
        opts.stripTags.forEach((tag) => {
          document.querySelectorAll(tag).forEach((el) => el.remove());
        });

        function removeComments(node: Node): void {
          node.childNodes.forEach((child) => {
            if (child.nodeType === Node.COMMENT_NODE) {
              node.removeChild(child);
            } else {
              removeComments(child);
            }
          });
        }
        removeComments(document.body);

        const keepSet = new Set(opts.keepAttrs);
        document.body.querySelectorAll('*').forEach((el) => {
          Array.from(el.attributes)
            .map((a) => a.name)
            // Keep: explicitly listed attrs, aria-* attrs, AND data-* attrs for selector candidates
            .filter((n) => !keepSet.has(n) && !n.startsWith('aria-') && !n.startsWith('data-'))
            .forEach((attr) => el.removeAttribute(attr));
        });

        return { title: document.title ?? '', rawHtml: document.body.innerHTML };
      },
      { stripTags: [...STRIP_TAGS], keepAttrs: [...KEEP_ATTRS] }
    );

    const minifiedHtml = rawHtml
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .replace(/^ +| +$/gm, '')
      .trim();

    return { title, minifiedHtml, environment };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
