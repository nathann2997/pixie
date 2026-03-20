/**
 * analyzeWebsiteWithAI — Auditor
 *
 * Runs a full site audit using the pigxel_site_auditor.md knowledge base:
 * - Scrapes the site with Playwright (runtime environment detection + HTML)
 * - Sends to GPT-4o with the Auditor system prompt
 * - Saves `ai_audit` (rich technical brief for the Event Builder pipeline)
 * - Saves `ai_analysis` (simplified business summary for the Pulse UI — backward compat)
 */

import * as functions from 'firebase-functions/v2';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeAndAudit, type AuditEnvironment } from './browser';

// ─── Load knowledge base at module init (cached for lifetime of the instance) ─

function loadKnowledge(filename: string): string {
  try {
    return fs.readFileSync(path.join(__dirname, '../../knowledge', filename), 'utf8');
  } catch {
    functions.logger.warn(`[analyzeWebsite] Could not load ${filename}`);
    return '';
  }
}

const AUDITOR_PROMPT = loadKnowledge('pigxel_site_auditor.md');

// ─── Types (SiteAnalysis kept for backward compat with Pulse/Health page UI) ──

export interface ConversionAction {
  action: string;
  intent: 'purchase' | 'lead_generation' | 'signup' | 'contact' | 'engagement' | 'download';
  urgency: 'high' | 'medium' | 'low';
}

export interface SiteAnalysis {
  businessType: 'ecommerce' | 'saas' | 'services' | 'blog' | 'portfolio' | 'restaurant' | 'healthcare' | 'education' | 'other';
  businessDescription: string;
  primaryProducts: string[];
  targetAudience: string;
  keyConversionActions: ConversionAction[];
  pageFeatures: {
    hasEcommerce: boolean;
    hasPricing: boolean;
    hasContactForm: boolean;
    hasNewsletterSignup: boolean;
    hasCTA: boolean;
  };
  suggestedTrackingGoals: string[];
  analyzedAt: string;
}

export interface AuditConversionPoint {
  id: string;
  label: string;
  page_url: string;
  priority: 'high' | 'medium' | 'low';
  intent: string;
  element_description: string;
  selector_candidates: string[];
  recommended_selector: string;
  recommended_selector_rationale: string;
  trigger: 'click' | 'submit' | 'pageview' | 'scroll';
  datalayer_event_found: string | null;
  datalayer_usable: boolean;
  datalayer_usable_reason: string;
  data_available: Record<string, boolean>;
  data_source: 'datalayer' | 'data-attribute' | 'json-ld' | 'dom-scraping';
  recommended_events: { ga4?: string; meta?: string };
}

export interface SiteAudit {
  audit_meta: {
    site_url: string;
    framework_detected: string;
    is_spa: boolean;
    pixels_detected: AuditEnvironment['pixels'];
    datalayer_present: boolean;
    consent_platform_detected: string;
  };
  business_summary: Omit<SiteAnalysis, 'analyzedAt'>;
  conversion_points: AuditConversionPoint[];
  flags: string[];
  not_recommended: string[];
  handoff_notes: string;
  auditedAt: string;
}

export interface AnalyzeRequest  { siteId: string }
export interface AnalyzeResponse { success: boolean; analysis: SiteAnalysis; audit: SiteAudit }

// ─── Build the user message sent to GPT-4o ────────────────────────────────────

function buildUserMessage(
  targetUrl: string,
  title: string,
  env: AuditEnvironment,
  html: string
): string {
  const pixelStr = Object.entries(env.pixels)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const envSection = [
    `Site URL: ${targetUrl}`,
    `Page Title: ${title}`,
    '',
    '=== ENVIRONMENT ===',
    `Framework: ${env.frameworkDetected}`,
    `Is SPA: ${env.isSpa}`,
    `Pixels: ${pixelStr}`,
    `DataLayer present: ${env.datalayerPresent}`,
    `DataLayer events: ${JSON.stringify(env.datalayerEvents)}`,
    `Consent platform: ${env.consentPlatform}`,
    env.jsonLdContent
      ? `JSON-LD: ${env.jsonLdContent.replace(/\s+/g, ' ').slice(0, 500)}`
      : 'JSON-LD: none',
    '',
    '=== PAGE HTML ===',
    html,
  ].join('\n');

  return envSection;
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const analyzeWebsiteWithAI = onCall(
  { region: 'us-central1', timeoutSeconds: 180, memory: '1GiB', secrets: [OPENAI_API_KEY] },
  async (request: CallableRequest<AnalyzeRequest>): Promise<AnalyzeResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');

    const { siteId } = request.data;
    if (typeof siteId !== 'string' || !siteId.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "siteId" string is required.');
    }

    const db      = admin.firestore();
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) throw new HttpsError('not-found', 'Site not found.');

    const siteData = siteDoc.data() as { owner_id: string; url: string };
    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not allowed to analyse this site.');
    }

    const targetUrl = siteData.url.startsWith('http') ? siteData.url : `https://${siteData.url}`;
    functions.logger.info('[analyzeWebsite] Starting audit', { siteId, targetUrl });

    // ── Step 1: Scrape + detect environment ─────────────────────────────────
    const { title, minifiedHtml, environment } = await scrapeAndAudit(targetUrl).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpsError('internal', `Failed to scrape site: ${msg}`);
    });

    const MAX_HTML_CHARS = 55_000;
    const truncatedHtml  = minifiedHtml.length > MAX_HTML_CHARS
      ? minifiedHtml.slice(0, MAX_HTML_CHARS) + '\n[truncated]'
      : minifiedHtml;

    const userMessage = buildUserMessage(targetUrl, title, environment, truncatedHtml);

    // ── Step 2: Call GPT-4o with the Auditor knowledge base ─────────────────
    const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '';
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY is not configured.');

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model:           'gpt-4o',
      temperature:     0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AUDITOR_PROMPT || FALLBACK_AUDITOR_PROMPT },
        { role: 'user',   content: userMessage },
      ],
    });

    const rawText = (completion.choices[0]?.message?.content ?? '').trim();

    // ── Step 3: Parse response ───────────────────────────────────────────────
    let parsed: Omit<SiteAudit, 'auditedAt'>;
    try {
      parsed = JSON.parse(rawText) as Omit<SiteAudit, 'auditedAt'>;
    } catch {
      functions.logger.error('[analyzeWebsite] Failed to parse GPT-4o JSON', { rawText: rawText.slice(0, 500) });
      throw new HttpsError('internal', 'AI returned an unexpected response. Please try again.');
    }

    const now       = new Date().toISOString();
    const siteAudit: SiteAudit = { ...parsed, auditedAt: now };

    // ── Step 4: Derive simplified ai_analysis for the Pulse UI ──────────────
    const bs = parsed.business_summary;
    const analysis: SiteAnalysis = {
      businessType:        bs?.businessType ?? 'other',
      businessDescription: bs?.businessDescription ?? '',
      primaryProducts:     bs?.primaryProducts ?? [],
      targetAudience:      bs?.targetAudience ?? '',
      keyConversionActions: (bs?.keyConversionActions ?? []).slice(0, 4),
      pageFeatures:        bs?.pageFeatures ?? {
        hasEcommerce: false, hasPricing: false, hasContactForm: false,
        hasNewsletterSignup: false, hasCTA: false,
      },
      suggestedTrackingGoals: bs?.suggestedTrackingGoals ?? [],
      analyzedAt: now,
    };

    // ── Step 5: Persist both fields to Firestore ─────────────────────────────
    await siteRef.update({
      ai_audit:       siteAudit,
      ai_analysis:    analysis,
      ai_plan_status: 'analysed',
    });

    functions.logger.info('[analyzeWebsite] Audit complete', {
      siteId,
      conversionPoints: siteAudit.conversion_points?.length ?? 0,
      isSpa: siteAudit.audit_meta?.is_spa,
    });

    return { success: true, analysis, audit: siteAudit };
  }
);

// ─── Minimal fallback if .md file fails to load ───────────────────────────────

const FALLBACK_AUDITOR_PROMPT = `You are a website conversion tracking auditor.
Analyse the provided HTML and environment data and return a JSON object with these fields:
audit_meta (site_url, framework_detected, is_spa, pixels_detected, datalayer_present, consent_platform_detected),
business_summary (businessType, businessDescription, primaryProducts, targetAudience, keyConversionActions, pageFeatures, suggestedTrackingGoals),
conversion_points (array of: id, label, page_url, priority, intent, element_description, selector_candidates, recommended_selector, recommended_selector_rationale, trigger, datalayer_event_found, datalayer_usable, datalayer_usable_reason, data_available, data_source, recommended_events),
flags (array of strings), not_recommended (array of strings), handoff_notes (string).`;
