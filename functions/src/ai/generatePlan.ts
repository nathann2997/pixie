/**
 * generateTrackingPlan — Event Builder
 *
 * Uses the pigxel_event_builder.md knowledge base to generate complete,
 * self-contained tracking scripts for each conversion point found in the
 * site audit (ai_audit). Falls back to ai_analysis if no audit exists yet.
 *
 * Each DraftEvent now includes a `script` field — a ready-to-inject <script> tag.
 */

import * as functions from 'firebase-functions/v2';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import type { SiteAnalysis } from './analyzeWebsite';
import type { SiteAudit } from './analyzeWebsite';

// ─── Load knowledge base ──────────────────────────────────────────────────────

function loadKnowledge(filename: string): string {
  try {
    return fs.readFileSync(path.join(__dirname, '../../knowledge', filename), 'utf8');
  } catch {
    functions.logger.warn(`[generatePlan] Could not load ${filename}`);
    return '';
  }
}

const BUILDER_PROMPT = loadKnowledge('pigxel_event_builder.md');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DraftEvent {
  event_name: string;
  selector: string;
  trigger: 'click' | 'submit' | 'pageview';
  platform: 'ga4' | 'meta' | 'tiktok' | 'linkedin' | 'google_ads' | 'both' | 'all';
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  included: boolean;
  /** Complete self-contained <script> tag ready to inject into the client's site */
  script?: string;
  /** How data is extracted — for transparency in the UI */
  data_strategy?: 'datalayer' | 'data-attribute' | 'json-ld' | 'dom-scraping';
  selector_rationale?: string;
  google_ads_conversion_label?: string;
  linkedin_conversion_id?: string;
}

export interface TrackingDraft {
  recommendedPixels: { ga4: boolean; meta: boolean; tiktok: boolean; linkedin: boolean; google_ads: boolean };
  recommendedEvents: DraftEvent[];
  conversionFunnelSteps: string[];
  implementationNotes: string;
  estimatedSetupTime: string;
  generatedAt: string;
  /** Populated when generated from a full audit */
  build_notes?: string;
}

export interface GeneratePlanRequest  { siteId: string }
export interface GeneratePlanResponse { success: boolean; plan: TrackingDraft }

// ─── Build user message for GPT-4o ───────────────────────────────────────────

function buildAuditMessage(audit: SiteAudit): string {
  return [
    'Generate tracking scripts for every conversion point in this audit report.',
    'Follow the SOP exactly — choose data strategy in priority order, apply all failsafes,',
    'use MutationObserver if is_spa is true, apply consent wrapper if consent platform is detected.',
    '',
    JSON.stringify(audit, null, 2),
  ].join('\n');
}

function buildAnalysisMessage(analysis: SiteAnalysis): string {
  return [
    'No full audit is available. Use the site analysis below to infer conversion points',
    'and generate tracking scripts for the most likely elements.',
    '',
    JSON.stringify(analysis, null, 2),
  ].join('\n');
}

// ─── Parse Event Builder output → DraftEvent[] ───────────────────────────────

interface BuilderEvent {
  id?: string;
  label?: string;
  selector?: string;
  selector_rationale?: string;
  trigger?: string;
  platform?: string;
  platforms?: string[];
  data_strategy?: string;
  data_strategy_rationale?: string;
  script?: string;
  event_name?: string;
  description?: string;
  priority?: string;
  estimatedImpact?: string;
}

interface BuilderOutput {
  events?: BuilderEvent[];
  build_notes?: string;
}

function mapBuilderEventToDraft(e: BuilderEvent): DraftEvent {
  // Resolve platform — builder may return array or single string
  let platform: DraftEvent['platform'] = 'ga4';
  if (Array.isArray(e.platforms)) {
    if (e.platforms.length > 2) platform = 'all';
    else if (e.platforms.length === 2 && e.platforms.includes('ga4') && e.platforms.includes('meta')) platform = 'both';
    else platform = (e.platforms[0] as DraftEvent['platform']) ?? 'ga4';
  } else if (e.platform) {
    platform = e.platform as DraftEvent['platform'];
  }

  const eventName = e.event_name ?? (e.label ?? 'conversion')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 40);

  const mapped: DraftEvent = {
    event_name:         platform === 'google_ads' ? 'conversion' : eventName,
    selector:           e.selector ?? '',
    trigger:            (e.trigger as DraftEvent['trigger']) ?? 'click',
    platform,
    description:        e.description ?? e.label ?? '',
    priority:           (e.priority as DraftEvent['priority']) ?? 'medium',
    estimatedImpact:    e.estimatedImpact ?? '',
    included:           true,
    script:             e.script,
    data_strategy:      e.data_strategy as DraftEvent['data_strategy'],
    selector_rationale: e.selector_rationale ?? e.data_strategy_rationale,
  };
  const ext = e as Record<string, unknown>;
  if (typeof ext['google_ads_conversion_label'] === 'string') mapped.google_ads_conversion_label = ext['google_ads_conversion_label'] as string;
  if (typeof ext['linkedin_conversion_id']      === 'string') mapped.linkedin_conversion_id      = ext['linkedin_conversion_id']      as string;
  return mapped;
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const generateTrackingPlan = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', secrets: [OPENAI_API_KEY] },
  async (request: CallableRequest<GeneratePlanRequest>): Promise<GeneratePlanResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');

    const { siteId } = request.data;
    if (typeof siteId !== 'string' || !siteId.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "siteId" string is required.');
    }

    const db      = admin.firestore();
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) throw new HttpsError('not-found', 'Site not found.');

    const siteData = siteDoc.data() as {
      owner_id: string;
      ai_audit?: SiteAudit;
      ai_analysis?: SiteAnalysis;
    };

    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not allowed to generate a plan for this site.');
    }

    if (!siteData.ai_audit && !siteData.ai_analysis) {
      throw new HttpsError(
        'failed-precondition',
        'No site analysis found. Run "Analyse my site" on the Pulse page first.'
      );
    }

    functions.logger.info('[generatePlan] Generating Event Builder plan', {
      siteId,
      hasAudit: !!siteData.ai_audit,
    });

    const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '';
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY is not configured.');

    const openai = new OpenAI({ apiKey });

    // Use full audit if available — richer context means better scripts
    const userMessage = siteData.ai_audit
      ? buildAuditMessage(siteData.ai_audit)
      : buildAnalysisMessage(siteData.ai_analysis!);

    const systemPrompt = BUILDER_PROMPT || FALLBACK_BUILDER_PROMPT;

    const completion = await openai.chat.completions.create({
      model:           'gpt-4o',
      temperature:     0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    });

    const rawText = (completion.choices[0]?.message?.content ?? '').trim();

    let parsed: BuilderOutput;
    try {
      parsed = JSON.parse(rawText) as BuilderOutput;
    } catch {
      functions.logger.error('[generatePlan] Failed to parse GPT-4o JSON', { rawText: rawText.slice(0, 500) });
      throw new HttpsError('internal', 'AI returned an unexpected response. Please try again.');
    }

    const draftEvents: DraftEvent[] = (parsed.events ?? []).map(mapBuilderEventToDraft);

    // Infer pixel recommendations from which platforms appear in draft events
    const platformsUsed = new Set(draftEvents.map((e) => e.platform));
    const hasAll  = platformsUsed.has('all');
    const hasBoth = platformsUsed.has('both');
    const recommendedPixels = {
      ga4:        hasAll || hasBoth || platformsUsed.has('ga4'),
      meta:       hasAll || hasBoth || platformsUsed.has('meta'),
      tiktok:     hasAll || platformsUsed.has('tiktok'),
      linkedin:   hasAll || platformsUsed.has('linkedin'),
      google_ads: hasAll || platformsUsed.has('google_ads'),
    };

    // Build funnel steps from high-priority events
    const funnelSteps = draftEvents
      .filter((e) => e.priority === 'high')
      .map((e) => e.description || e.event_name)
      .slice(0, 5);

    const plan: TrackingDraft = {
      recommendedPixels,
      recommendedEvents:      draftEvents,
      conversionFunnelSteps:  funnelSteps,
      implementationNotes:    parsed.build_notes ?? siteData.ai_audit?.handoff_notes ?? '',
      estimatedSetupTime:     `${draftEvents.length * 5}–${draftEvents.length * 10} minutes`,
      generatedAt:            new Date().toISOString(),
      build_notes:            parsed.build_notes,
    };

    await siteRef.update({
      ai_draft_plan:  plan,
      ai_plan_status: 'draft_ready',
    });

    functions.logger.info('[generatePlan] Plan saved', {
      siteId,
      eventsCount: draftEvents.length,
      withScripts: draftEvents.filter((e) => !!e.script).length,
    });

    return { success: true, plan };
  }
);

// ─── Fallback prompt ──────────────────────────────────────────────────────────

const FALLBACK_BUILDER_PROMPT = `You are a JavaScript tracking expert.
Generate client-side GA4 and Meta Pixel tracking scripts for the conversion points in the provided audit.
Return JSON: { "events": [{ "id", "label", "selector", "selector_rationale", "trigger", "platform", "data_strategy", "data_strategy_rationale", "script", "event_name", "description", "priority", "estimatedImpact" }], "build_notes": "..." }
Each "script" must be a complete self-contained <script> tag with null checks, DOMContentLoaded, pixel function checks, and deduplication guards.`;
