/**
 * scrapeAndMinifyUrl — Cloud Function
 *
 * Scrapes a URL with Playwright, strips all non-semantic DOM noise, and
 * returns a heavily minified HTML string suitable for LLM consumption.
 * Delegates to the shared browser module.
 */

import * as functions from 'firebase-functions/v2';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import { scrapeAndMinify } from './browser';

export interface ScrapeRequest { url: string }
export interface ScrapeResponse { success: boolean; title: string; minifiedHtml: string; error?: string }

export const scrapeAndMinifyUrl = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '1GiB' },
  async (request: CallableRequest<ScrapeRequest>): Promise<ScrapeResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');

    const { url } = request.data;
    if (typeof url !== 'string' || !url.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "url" string is required.');
    }

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    functions.logger.info('[scrapeUrl] Starting scrape', { uid: request.auth.uid, targetUrl });

    const { title, minifiedHtml } = await scrapeAndMinify(targetUrl).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpsError('internal', `Could not scrape the page: ${msg}`);
    });

    functions.logger.info('[scrapeUrl] Scrape complete', { targetUrl, htmlLength: minifiedHtml.length });
    return { success: true, title, minifiedHtml };
  }
);
