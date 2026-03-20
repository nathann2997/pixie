/**
 * eventBuilderChat — Conversational Event Builder
 *
 * A multi-turn chat that helps marketers describe what they want tracked.
 * Powered by the pigxel_event_builder.md knowledge base — the AI understands
 * how to generate production-ready scripts, not just collect config fields.
 *
 * When all details are confirmed, returns event_ready: true with a complete
 * tracking script alongside the event config.
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
import * as fs from 'fs';
import * as path from 'path';

// ─── Load knowledge base ──────────────────────────────────────────────────────

function loadKnowledge(filename: string): string {
  try {
    return fs.readFileSync(path.join(__dirname, '../../knowledge', filename), 'utf8');
  } catch {
    return '';
  }
}

const BUILDER_KNOWLEDGE = loadKnowledge('pigxel_event_builder.md');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  siteId: string;
  siteUrl: string;
  messages: ChatMessage[];
}

export interface EventDraft {
  selector: string;
  trigger: 'click' | 'submit' | 'pageview';
  platform: 'ga4' | 'meta' | 'tiktok' | 'linkedin' | 'google_ads' | 'both' | 'all';
  event_name: string;
  description: string;
  /** Complete self-contained <script> tag ready to inject */
  script?: string;
  data_strategy?: string;
  /** Google Ads: Conversion Label (required when platform=google_ads) */
  google_ads_conversion_label?: string;
  /** LinkedIn: Conversion ID number (required when platform=linkedin) */
  linkedin_conversion_id?: string;
}

export interface ChatResponse {
  message: string;
  event_ready: boolean;
  event?: EventDraft;
}

// ─── System prompt ────────────────────────────────────────────────────────────
// Combines the full Event Builder knowledge base with the conversational wrapper.

const SYSTEM_PROMPT = `${BUILDER_KNOWLEDGE}

---

## Your Role in This Chat

You are also a friendly conversational assistant. A marketer is describing what they want
tracked. Your job is to collect the details needed to generate a complete tracking script.

You need:
1. WHAT — what action to track (button click, form submission, page visit)
2. PLATFORM — GA4, Meta, TikTok, LinkedIn, Google Ads, or any combination
3. EVENT NAME — suggest a name based on the platform convention (see below), ask them to confirm
4. TRIGGER — infer from context (click for buttons, submit for forms, pageview for pages)

## Platform-Specific Rules

### GA4 (gtag)
- Event names must be snake_case (e.g. generate_lead, add_to_cart)
- Fire: gtag('event', 'event_name', { params })
- Check: typeof gtag === 'function'

### Meta (fbq)
- Event names are PascalCase standard events (Lead, Purchase, CompleteRegistration, AddToCart)
- Fire: fbq('track', 'EventName', { value, currency })
- Check: typeof fbq === 'function'

### TikTok (ttq)
- Event names are PascalCase TikTok standard events: SubmitForm, PlaceAnOrder, CompleteRegistration, AddToCart, ViewContent, Contact, Download, ClickButton
- Fire: ttq.track('EventName', { value, currency, contents: [] })
- Check: typeof ttq !== 'undefined'
- IMPORTANT: ttq.page() must be called on every SPA route change
- DO NOT use Meta event names for TikTok — they are different

### LinkedIn (lintrk)
- LinkedIn does NOT use named events. Each conversion is identified by a numeric Conversion ID.
- Fire: lintrk('track', { conversion_id: NUMBER })
- Check: typeof lintrk === 'function'
- IMPORTANT: If the user selects LinkedIn, you MUST ask for their LinkedIn Conversion ID (a number from Campaign Manager). Never guess or fabricate it.
- Store the Conversion ID in the "linkedin_conversion_id" field of the JSON response.

### Google Ads (gtag with AW- config)
- The event name is ALWAYS "conversion" — never customise it.
- Fire: gtag('event', 'conversion', { 'send_to': 'AW-CONVERSIONID/LABEL', value, currency, transaction_id })
- Check: typeof gtag === 'function'
- IMPORTANT: If the user selects Google Ads, you MUST ask for their Conversion Label (found in Google Ads → Tools → Conversions → Tag setup). Never guess it.
- Store the Conversion Label in the "google_ads_conversion_label" field, and use "conversion" as event_name.
- The send_to value in the script must be: 'AW-' + conversionId + '/' + conversionLabel

## Conversation Rules
- Ask for ONE missing piece per reply. Be friendly and concise.
- Do NOT use technical jargon.
- Suggest sensible defaults and ask for confirmation rather than open questions.
- If the user gives a URL like /contact-sales, infer trigger=submit.
- For multi-platform requests, generate one combined script that fires all selected pixels.

Once all required details are confirmed, apply your full Event Builder expertise to generate
the complete tracking script. Then reply with ONLY this JSON — no text before or after:

{"event_ready":true,"event":{"selector":"SELECTOR","trigger":"TRIGGER","platform":"PLATFORM","event_name":"EVENT_NAME","description":"Plain English description","script":"<script>\\n// complete self-contained tracking script\\n</script>","data_strategy":"dom-scraping|datalayer|data-attribute|json-ld","google_ads_conversion_label":"LABEL_IF_GADS","linkedin_conversion_id":"ID_IF_LINKEDIN"},"message":"Friendly 1-sentence summary"}

Selector format:
- Page visits: url=/the-path
- Button/link clicks: text=Button Label
- Form submissions: url=/the-page-path

Platform values: "ga4", "meta", "tiktok", "linkedin", "google_ads", "both" (ga4+meta), "all" (all platforms)
Trigger values: "click", "submit", "pageview"

The script must follow your full SOP: DOMContentLoaded wrapper, null checks, pixel function
checks, deduplication guards. Include consent wrappers if detected. Use MutationObserver for SPAs.`.trim();

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const eventBuilderChat = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', secrets: [OPENAI_API_KEY] },
  async (request: CallableRequest<ChatRequest>): Promise<ChatResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const { messages, siteUrl } = request.data;

    if (!Array.isArray(messages)) {
      throw new HttpsError('invalid-argument', 'messages must be an array.');
    }

    const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '';
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY is not configured.');

    const openai = new OpenAI({ apiKey });

    const systemContent = siteUrl
      ? `${SYSTEM_PROMPT}\n\nThe user's website is: ${siteUrl}`
      : SYSTEM_PROMPT;

    let rawText = '';
    try {
      const completion = await openai.chat.completions.create({
        model:       'gpt-4o',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemContent },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      rawText = (completion.choices[0]?.message?.content ?? '').trim();
    } catch (err) {
      functions.logger.error('[eventBuilderChat] OpenAI error', err);
      throw new HttpsError('internal', 'AI request failed. Please try again.');
    }

    functions.logger.info('[eventBuilderChat] Response', { preview: rawText.slice(0, 300) });

    // Detect event_ready JSON block (may be wrapped in a markdown code fence)
    const jsonMatch = rawText.match(/\{[\s\S]*"event_ready"\s*:\s*true[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as ChatResponse;
        if (parsed.event_ready && parsed.event) {
          return {
            message:     parsed.message ?? "Here's what I'll set up for you.",
            event_ready: true,
            event:       parsed.event,
          };
        }
      } catch {
        // fall through to plain message
      }
    }

    return { message: rawText, event_ready: false };
  }
);
