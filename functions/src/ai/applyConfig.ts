/**
 * applyTrackingConfig — Pipeline step 5 / "Activation"
 *
 * Promotes the user-approved AI draft plan to the live trackingConfig in
 * Firestore.  Only events where included === true are applied.
 * Clears the draft plan and marks ai_plan_status as 'applied'.
 */

import * as functions from 'firebase-functions/v2';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import type { TrackingDraft } from './generatePlan';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyConfigRequest {
  siteId: string;
  /**
   * Whether to also apply the AI-recommended pixels (ga4: true etc.).
   * Defaults to false so users retain manual control of pixel IDs.
   */
  applyPixelRecommendations?: boolean;
}

export interface ApplyConfigResponse {
  success: boolean;
  appliedEventsCount: number;
  appliedPixels: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TrackingEvent {
  selector: string;
  trigger: string;
  platform: string;
  event_name: string;
  description?: string;
  /** Generated <script> tag ready to inject into the client's site */
  script?: string;
  data_strategy?: string;
  selector_rationale?: string;
  /** Google Ads only: Conversion Label from Google Ads Campaign Manager */
  google_ads_conversion_label?: string;
  /** LinkedIn only: numeric Conversion ID from LinkedIn Campaign Manager */
  linkedin_conversion_id?: string;
}

interface TrackingConfig {
  pixels: {
    ga4?: string;
    meta?: string;
    tiktok?: string;
    linkedin?: string;
    google_ads?: string;
  };
  events: TrackingEvent[];
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const applyTrackingConfig = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request: CallableRequest<ApplyConfigRequest>): Promise<ApplyConfigResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { siteId, applyPixelRecommendations = false } = request.data;

    if (typeof siteId !== 'string' || !siteId.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "siteId" string is required.');
    }

    const db = admin.firestore();
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found.');
    }

    const siteData = siteDoc.data() as {
      owner_id: string;
      ai_draft_plan?: TrackingDraft;
      trackingConfig?: TrackingConfig;
    };

    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not allowed to apply config for this site.');
    }

    if (!siteData.ai_draft_plan) {
      throw new HttpsError(
        'failed-precondition',
        'No draft plan found. Generate a plan first.'
      );
    }

    const draft = siteData.ai_draft_plan;

    // ── Build the events list from included items ───────────────────────────
    const includedEvents: TrackingEvent[] = draft.recommendedEvents
      .filter((e) => e.included)
      .map((e) => {
        const base: TrackingEvent = {
          selector:           e.selector,
          trigger:            e.trigger,
          platform:           e.platform,
          event_name:         e.platform === 'google_ads' ? 'conversion' : e.event_name,
          description:        e.description,
          script:             e.script,
          data_strategy:      e.data_strategy,
          selector_rationale: e.selector_rationale,
        };
        if ((e as TrackingEvent).google_ads_conversion_label) {
          base.google_ads_conversion_label = (e as TrackingEvent).google_ads_conversion_label;
        }
        if ((e as TrackingEvent).linkedin_conversion_id) {
          base.linkedin_conversion_id = (e as TrackingEvent).linkedin_conversion_id;
        }
        return base;
      });

    if (includedEvents.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'No events are included in the draft. Toggle at least one event before applying.'
      );
    }

    // ── Build updated trackingConfig (merge with existing pixels) ───────────
    const existingPixels = siteData.trackingConfig?.pixels ?? {};

    const appliedPixels: string[] = [];
    const newPixels = { ...existingPixels };

    if (applyPixelRecommendations) {
      if (draft.recommendedPixels.ga4 && !newPixels.ga4) {
        newPixels.ga4 = '';
        appliedPixels.push('ga4');
      }
      if (draft.recommendedPixels.meta && !newPixels.meta) {
        newPixels.meta = '';
        appliedPixels.push('meta');
      }
      if (draft.recommendedPixels.tiktok && !newPixels.tiktok) {
        newPixels.tiktok = '';
        appliedPixels.push('tiktok');
      }
      if (draft.recommendedPixels.linkedin && !newPixels.linkedin) {
        newPixels.linkedin = '';
        appliedPixels.push('linkedin');
      }
      if ((draft.recommendedPixels as { google_ads?: boolean }).google_ads && !newPixels.google_ads) {
        newPixels.google_ads = '';
        appliedPixels.push('google_ads');
      }
    }

    const updatedTrackingConfig: TrackingConfig = {
      pixels: newPixels,
      events: includedEvents,
    };

    // ── Persist ─────────────────────────────────────────────────────────────
    await siteRef.update({
      trackingConfig: updatedTrackingConfig,
      ai_plan_status: 'applied',
      ai_draft_plan:  FieldValue.delete(),   // clear the draft once applied
      updated_at:     FieldValue.serverTimestamp(),
    });

    functions.logger.info('[applyConfig] Tracking config applied', {
      siteId,
      eventsApplied: includedEvents.length,
      pixelsApplied: appliedPixels,
    });

    return {
      success: true,
      appliedEventsCount: includedEvents.length,
      appliedPixels,
    };
  }
);
