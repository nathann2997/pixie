/**
 * updateDraftPlan — Pipeline step 4 / "Refinement"
 *
 * Allows the user to toggle individual events in or out of the draft plan,
 * or replace the entire events list (for manual edits from the UI).
 */

import * as functions from 'firebase-functions/v2';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type { DraftEvent, TrackingDraft } from './generatePlan';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateDraftPlanRequest {
  siteId: string;
  /**
   * Pass the full updated events array to replace the draft list.
   * Or pass a single { index, included } to toggle one item.
   */
  events?: DraftEvent[];
  toggleIndex?: number;
  toggleIncluded?: boolean;
}

export interface UpdateDraftPlanResponse {
  success: boolean;
  updatedEvents: DraftEvent[];
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const updateDraftPlan = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request: CallableRequest<UpdateDraftPlanRequest>): Promise<UpdateDraftPlanResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { siteId, events, toggleIndex, toggleIncluded } = request.data;

    if (typeof siteId !== 'string' || !siteId.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "siteId" string is required.');
    }

    const db = admin.firestore();
    const siteRef = db.collection('sites').doc(siteId);
    const siteDoc = await siteRef.get();

    if (!siteDoc.exists) {
      throw new HttpsError('not-found', 'Site not found.');
    }

    const siteData = siteDoc.data() as { owner_id: string; ai_draft_plan?: TrackingDraft };
    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not allowed to edit the draft for this site.');
    }

    if (!siteData.ai_draft_plan) {
      throw new HttpsError(
        'failed-precondition',
        'No draft plan found. Generate a plan first.'
      );
    }

    let updatedEvents: DraftEvent[];

    if (Array.isArray(events)) {
      // Full replacement
      updatedEvents = events;
    } else if (typeof toggleIndex === 'number' && typeof toggleIncluded === 'boolean') {
      // Single toggle
      updatedEvents = (siteData.ai_draft_plan.recommendedEvents ?? []).map((e, i) =>
        i === toggleIndex ? { ...e, included: toggleIncluded } : e
      );
    } else {
      throw new HttpsError(
        'invalid-argument',
        'Provide either "events" (full array) or "toggleIndex" + "toggleIncluded".'
      );
    }

    await siteRef.update({
      'ai_draft_plan.recommendedEvents': updatedEvents,
    });

    functions.logger.info('[updateDraftPlan] Draft updated', {
      siteId,
      includedCount: updatedEvents.filter((e) => e.included).length,
    });

    return { success: true, updatedEvents };
  }
);
