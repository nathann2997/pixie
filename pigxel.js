/**
 * Pigxel - AI Marketing Agent
 * Audit-first tracking: detects existing pixels, reports findings,
 * and forwards conversion events to whatever is already installed.
 * Never auto-injects scripts.
 * @version 2.0.0
 */
(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  let config = null;
  let clientId = null;
  let isDebugMode = false;
  let apiBaseUrl = null;

  // ── Utilities ────────────────────────────────────────────────

  function debugLog(msg, data) {
    if (isDebugMode) {
      console.log('[Pigxel] ' + msg, data !== undefined ? data : '');
    }
  }

  function handleError(error, context) {
    console.warn('[Pigxel] Non-critical error in ' + context + ':', error);
  }

  // ── Parameter Helpers ──────────────────────────────────────────

  function applyTransform(raw, transform) {
    if (!transform || transform === 'as_is') return raw;
    if (transform === 'strip_currency' || transform === 'parse_number') {
      return parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
    }
    return raw;
  }

  function findDataAttribute(matchedEl, attrName) {
    var el = matchedEl;
    var depth = 0;
    while (el && el !== document.body && depth < 10) {
      var val = el.getAttribute(attrName);
      if (val !== null) return val;
      el = el.parentElement;
      depth++;
    }
    return null;
  }

  function extractJsonLd(path) {
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var data = JSON.parse(scripts[i].textContent || '{}');
        var parts = path.split('.');
        var val = data;
        for (var j = 0; j < parts.length; j++) {
          if (val == null) break;
          val = val[parts[j]];
        }
        if (val !== undefined && val !== null) return String(val);
      }
    } catch (e) { debugLog('JSON-LD extraction failed', e); }
    return null;
  }

  function buildParams(params, platform, platformFields, matchedEl) {
    var result = {};
    (params || []).forEach(function (p) {
      if (p.platforms && p.platforms.indexOf(platform) === -1) return;
      if (p.valueSource === 'css_selector' && p.dynamicConfig) {
        var el = document.querySelector(p.dynamicConfig.selector);
        var raw = el ? (el.textContent || el.value || '') : '';
        result[p.key] = applyTransform(raw, p.dynamicConfig.transform);
      } else if (p.valueSource === 'data_attribute' && p.dynamicConfig) {
        result[p.key] = applyTransform(
          findDataAttribute(matchedEl, p.dynamicConfig.selector) || '',
          p.dynamicConfig.transform
        );
      } else if (p.valueSource === 'json_ld' && p.dynamicConfig) {
        result[p.key] = applyTransform(
          extractJsonLd(p.dynamicConfig.selector) || '',
          p.dynamicConfig.transform
        );
      } else {
        result[p.key] = p.value;
      }
    });
    if (platform === 'linkedin' && platformFields && platformFields.linkedin_conversion_id) {
      result.conversion_id = parseInt(platformFields.linkedin_conversion_id, 10);
    }
    if (platform === 'google_ads' && platformFields && platformFields.google_ads_conversion_id && platformFields.google_ads_conversion_label) {
      result.send_to = 'AW-' + platformFields.google_ads_conversion_id + '/' + platformFields.google_ads_conversion_label;
    }
    return result;
  }

  // ── Script Initialisation ────────────────────────────────────

  /**
   * Reads ?id=, ?debug=, and the optional data-api attribute (or ?api=)
   * from the <script> tag that loaded this file.
   */
  function extractScriptParams() {
    try {
      var currentScript =
        document.currentScript ||
        Array.from(document.getElementsByTagName('script')).find(function (s) {
          return s.src && s.src.includes('pigxel.js');
        });

      if (!currentScript || !currentScript.src) {
        console.warn('[Pigxel] Could not locate script tag');
        return null;
      }

      var scriptUrl = new URL(currentScript.src);
      var id = scriptUrl.searchParams.get('id');
      var debug = scriptUrl.searchParams.get('debug') === 'true';

      // API base URL can be supplied two ways:
      //   data-api="https://us-central1-my-project.cloudfunctions.net"
      //   src="pigxel.js?id=X&api=https://..."
      var apiOverride =
        currentScript.getAttribute('data-api') ||
        scriptUrl.searchParams.get('api') ||
        null;

      if (!id) {
        console.warn('[Pigxel] Missing ?id= parameter. Expected: pigxel.js?id=CLIENT_ID');
        return null;
      }

      debugLog('Params extracted', { id: id, debug: debug, apiOverride: apiOverride });
      return { clientId: id, debug: debug, apiOverride: apiOverride };
    } catch (error) {
      handleError(error, 'extractScriptParams');
      return null;
    }
  }

  /**
   * Resolves the Cloud Functions base URL.
   * Priority: data-api attribute → ?api= param → production default.
   */
  function resolveApiBaseUrl(override) {
    if (override) return override.replace(/\/$/, '');
    return 'https://us-central1-pixie-b5d33.cloudfunctions.net';
  }

  // ── Configuration Fetching ────────────────────────────────────

  async function fetchConfig(id) {
    try {
      debugLog('Fetching config', id);
      var response = await fetch(
        apiBaseUrl + '/getSiteConfig?id=' + encodeURIComponent(id)
      );

      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        throw new Error(errData.message || 'HTTP ' + response.status);
      }

      var cfg = await response.json();
      debugLog('Config loaded', cfg);

      if (cfg.status === 'pending' || cfg.status === 'paused') {
        console.log('[Pigxel] Status: ' + cfg.status.toUpperCase() + ' — auditing only, no events fired.');
      } else if (cfg.status === 'active') {
        console.log('[Pigxel] Status: ACTIVE — event forwarding enabled.');
      }

      return cfg;
    } catch (error) {
      handleError(error, 'fetchConfig');
      throw error;
    }
  }

  // ── Page Audit ───────────────────────────────────────────────
  //
  // Read-only detection of existing tracking implementations.
  // Never injects scripts, never modifies the page.

  function auditPage() {
    var audit = {
      detected_pixels: [],
      detected_scripts: [],
      has_data_layer: false,
      data_layer_healthy: false,
      data_layer_events: [],
      gtag_id: null,
      gtm_id: null,
      fbq_id: null,
      ttq_present: false,
      linkedin_present: false,
      pinterest_present: false,
      script_installed: true, // If we're running, we're installed
    };

    try {
      // ── dataLayer ──────────────────────────────────────────
      if (Array.isArray(window.dataLayer)) {
        audit.has_data_layer = true;
        audit.data_layer_healthy = window.dataLayer.length > 0;

        // Collect unique custom event names pushed to the dataLayer
        var seenEvents = new Set();
        window.dataLayer.forEach(function (item) {
          if (item && typeof item === 'object' && item.event && typeof item.event === 'string') {
            if (!item.event.startsWith('gtm.') && !seenEvents.has(item.event)) {
              seenEvents.add(item.event);
              audit.data_layer_events.push(item.event);
            }
          }
        });

        debugLog('dataLayer detected', {
          length: window.dataLayer.length,
          events: audit.data_layer_events,
        });
      }

      // ── Google Tag Manager ──────────────────────────────────
      var gtmScript = Array.from(document.scripts).find(function (s) {
        return s.src && s.src.includes('googletagmanager.com/gtm.js');
      });
      if (gtmScript) {
        var gtmMatch = gtmScript.src.match(/[?&]id=(GTM-[A-Z0-9]+)/);
        if (gtmMatch) audit.gtm_id = gtmMatch[1];
        audit.detected_pixels.push('gtm');
        audit.detected_scripts.push('Google Tag Manager' + (audit.gtm_id ? ' (' + audit.gtm_id + ')' : ''));
        debugLog('GTM detected', audit.gtm_id);
      }

      // ── GA4 / gtag.js ───────────────────────────────────────
      var gtagScript = Array.from(document.scripts).find(function (s) {
        return s.src && s.src.includes('googletagmanager.com/gtag/js');
      });
      if (gtagScript || typeof window.gtag === 'function') {
        // Try to recover the GA4 Measurement ID from dataLayer
        if (Array.isArray(window.dataLayer)) {
          for (var i = 0; i < window.dataLayer.length; i++) {
            var dl = window.dataLayer[i];
            if (
              Array.isArray(dl) &&
              dl[0] === 'config' &&
              typeof dl[1] === 'string' &&
              dl[1].startsWith('G-')
            ) {
              audit.gtag_id = dl[1];
              break;
            }
          }
        }

        if (!audit.detected_pixels.includes('gtm')) {
          audit.detected_pixels.push('ga4');
        }
        audit.detected_scripts.push('Google Analytics 4' + (audit.gtag_id ? ' (' + audit.gtag_id + ')' : ''));
        debugLog('GA4/gtag detected', audit.gtag_id);
      }

      // ── Meta Pixel ──────────────────────────────────────────
      var fbScript = Array.from(document.scripts).find(function (s) {
        return s.src && (s.src.includes('fbevents.js') || s.src.includes('connect.facebook.net'));
      });
      if (fbScript || typeof window.fbq === 'function') {
        // Attempt to read pixel ID from internal fbq state
        if (window.fbq && window.fbq._fbevents && window.fbq._fbevents.length > 0) {
          audit.fbq_id = window.fbq._fbevents[0].pixelId || null;
        }
        audit.detected_pixels.push('meta');
        audit.detected_scripts.push('Meta Pixel' + (audit.fbq_id ? ' (' + audit.fbq_id + ')' : ''));
        debugLog('Meta Pixel detected', audit.fbq_id);
      }

      // ── TikTok Pixel ────────────────────────────────────────
      if (typeof window.ttq !== 'undefined') {
        audit.ttq_present = true;
        audit.detected_pixels.push('tiktok');
        audit.detected_scripts.push('TikTok Pixel');
        debugLog('TikTok Pixel detected');
      }

      // ── LinkedIn Insight Tag ─────────────────────────────────
      if (typeof window._linkedin_data_partner_ids !== 'undefined') {
        audit.linkedin_present = true;
        audit.detected_pixels.push('linkedin');
        audit.detected_scripts.push('LinkedIn Insight Tag');
        debugLog('LinkedIn Insight detected');
      }

      // ── Pinterest Tag ────────────────────────────────────────
      if (typeof window.pintrk !== 'undefined') {
        audit.pinterest_present = true;
        audit.detected_pixels.push('pinterest');
        audit.detected_scripts.push('Pinterest Tag');
        debugLog('Pinterest Tag detected');
      }

    } catch (error) {
      handleError(error, 'auditPage');
    }

    if (audit.detected_pixels.length === 0) {
      console.log('[Pigxel] Audit: No tracking pixels detected on this page.');
    } else {
      console.log('[Pigxel] Audit: Detected — ' + audit.detected_scripts.join(', '));
    }

    if (audit.has_data_layer) {
      console.log('[Pigxel] dataLayer found' + (audit.data_layer_healthy ? ' with ' + window.dataLayer.length + ' entries.' : ' (empty).'));
    } else {
      console.log('[Pigxel] No dataLayer found. Using direct pixel calls for event forwarding.');
    }

    debugLog('Full audit result', audit);
    return audit;
  }

  // ── Report Audit ─────────────────────────────────────────────

  async function reportAudit(audit) {
    try {
      var body = Object.assign({}, audit, {
        audit_timestamp: new Date().toISOString(),
        page_url: window.location.href,
      });

      await fetch(
        apiBaseUrl + '/reportAudit?id=' + encodeURIComponent(clientId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      debugLog('Audit reported to Pigxel');
    } catch (error) {
      // Fire-and-forget — never block the page
      handleError(error, 'reportAudit');
    }
  }

  // ── Event Forwarding ─────────────────────────────────────────
  //
  // Forwards events to EXISTING tracking implementations only.
  // Priority order: dataLayer (most accurate) → gtag → fbq → ttq
  // Never injects new scripts.

  function trackEvent(platform, eventName, eventData) {
    eventData = eventData || {};
    try {
      debugLog('Forwarding event', { platform: platform, eventName: eventName });

      // 1. dataLayer (best — GTM routes it to all configured destinations)
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        window.dataLayer.push(
          Object.assign({ event: eventName, pigxel_platform: platform }, eventData)
        );
        debugLog('Event pushed to dataLayer', eventName);
        return;
      }

      // 2. GA4
      if (platform === 'ga4' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventData);
        debugLog('Event sent via gtag', eventName);
      }

      // 3. Meta
      if (platform === 'meta' && typeof window.fbq === 'function') {
        window.fbq('track', eventName, eventData);
        debugLog('Event sent via fbq', eventName);
      }

      // 4. TikTok
      if (platform === 'tiktok' && typeof window.ttq !== 'undefined') {
        window.ttq.track(eventName, eventData);
        debugLog('Event sent via ttq', eventName);
      }

      // 5. LinkedIn
      if (platform === 'linkedin' && typeof window.lintrk === 'function') {
        var convId = eventData.conversion_id;
        if (convId) {
          window.lintrk('track', { conversion_id: convId });
          debugLog('Event sent via lintrk', convId);
        }
      }

      // 6. Google Ads
      if (platform === 'google_ads' && typeof window.gtag === 'function') {
        var sendTo = eventData.send_to;
        if (sendTo) {
          window.gtag('event', 'conversion', {
            send_to: sendTo,
            value: eventData.value,
            currency: eventData.currency,
            transaction_id: eventData.transaction_id
          });
          debugLog('Google Ads conversion sent', sendTo);
        }
      }

    } catch (error) {
      handleError(error, 'trackEvent(' + platform + ', ' + eventName + ')');
    }
  }

  // ── Selector Resolution ───────────────────────────────────────

  function resolveSelector(target, selector) {
    if (selector.startsWith('url=')) return null;

    if (selector.startsWith('text=')) {
      var needle = selector.slice(5).toLowerCase().trim();
      if (!needle) return null;

      var CLICKABLE_TAGS = ['BUTTON', 'A', 'INPUT', 'LABEL', 'SPAN', 'LI', 'DIV', 'P'];
      var el = target;
      var depth = 0;

      while (el && el !== document.body && depth < 8) {
        var visibleText = (el.textContent || el.value || el.placeholder || '').toLowerCase().trim();
        var ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

        if (
          (visibleText.includes(needle) || ariaLabel.includes(needle)) &&
          CLICKABLE_TAGS.includes(el.tagName)
        ) {
          return el;
        }
        el = el.parentElement;
        depth++;
      }
      return null;
    }

    try {
      return target.closest(selector);
    } catch (e) {
      debugLog('Invalid CSS selector', selector);
      return null;
    }
  }

  // ── URL-based Rules ───────────────────────────────────────────

  function checkURLRules() {
    try {
      if (!config || !config.events) return;

      var href = window.location.href.toLowerCase();
      var pathname = window.location.pathname.toLowerCase();

      config.events.forEach(function (eventConfig) {
        if (!eventConfig.selector || !eventConfig.selector.startsWith('url=')) return;
        if (eventConfig.trigger !== 'pageview') return;

        var pattern = eventConfig.selector.slice(4).toLowerCase().trim();
        if (!pattern) return;

        if (href.includes(pattern) || pathname.includes(pattern)) {
          debugLog('URL rule matched', { pattern: pattern, event: eventConfig.event_name });
          var platforms = eventConfig.platforms || [eventConfig.platform];
          platforms.forEach(function (p) {
            var name = (eventConfig.platformNames && eventConfig.platformNames[p]) || eventConfig.event_name;
            var params = buildParams(eventConfig.params || [], p, eventConfig.platformFields || {}, null);
            trackEvent(p, name, params);
          });
        }
      });
    } catch (error) {
      handleError(error, 'checkURLRules');
    }
  }

  function patchHistoryForSPA() {
    try {
      // Guard: only patch once (prevents conflicts if pigxel.js loads twice)
      if (history.__pigxel_patched) return;
      history.__pigxel_patched = true;

      var _push = history.pushState.bind(history);
      var _replace = history.replaceState.bind(history);

      history.pushState = function () {
        _push.apply(history, arguments);
        setTimeout(checkURLRules, 0);
      };
      history.replaceState = function () {
        _replace.apply(history, arguments);
        setTimeout(checkURLRules, 0);
      };

      window.addEventListener('popstate', function () {
        setTimeout(checkURLRules, 0);
      });
    } catch (error) {
      handleError(error, 'patchHistoryForSPA');
    }
  }

  // ── DOM Event Handling ────────────────────────────────────────

  function handleDOMEvent(event) {
    try {
      if (!config || !config.events) return;

      var eventType = event.type;

      config.events.forEach(function (eventConfig) {
        if (eventConfig.trigger === 'pageview') return;
        if (eventConfig.trigger !== eventType) return;

        var matchedElement = resolveSelector(event.target, eventConfig.selector);

        if (matchedElement) {
          debugLog('DOM event matched', {
            selector: eventConfig.selector,
            trigger: eventConfig.trigger,
          });

          var platforms = eventConfig.platforms || [eventConfig.platform];

          function fireAll() {
            platforms.forEach(function (p) {
              var name = (eventConfig.platformNames && eventConfig.platformNames[p]) || eventConfig.event_name;
              var params = buildParams(eventConfig.params || [], p, eventConfig.platformFields || {}, matchedElement);
              trackEvent(p, name, params);
            });
          }

          if (eventType === 'submit') {
            event.preventDefault();
            fireAll();
            setTimeout(function () {
              if (typeof matchedElement.requestSubmit === 'function') {
                matchedElement.requestSubmit();
              } else if (typeof matchedElement.submit === 'function') {
                matchedElement.submit();
              }
            }, 150);
          } else {
            fireAll();
          }
        }
      });
    } catch (error) {
      handleError(error, 'handleDOMEvent');
    }
  }

  function setupEventForwarding() {
    try {
      document.addEventListener('click', handleDOMEvent, true);
      document.addEventListener('submit', handleDOMEvent, true);
      checkURLRules();
      patchHistoryForSPA();
      debugLog('Event forwarding active (SPA-safe, text= / url= / CSS supported)');
    } catch (error) {
      handleError(error, 'setupEventForwarding');
    }
  }

  // ── Main Init ─────────────────────────────────────────────────

  async function init() {
    try {
      var params = extractScriptParams();
      if (!params) return;

      clientId = params.clientId;
      isDebugMode = params.debug;
      apiBaseUrl = resolveApiBaseUrl(params.apiOverride);

      debugLog('Starting', { clientId: clientId, apiBaseUrl: apiBaseUrl });

      config = await fetchConfig(clientId);
      if (!config) return;

      // Always audit (read-only) — runs regardless of active/paused/pending
      var audit = auditPage();

      // Report findings back — fire-and-forget
      reportAudit(audit);

      // Only forward events when the site is active
      if (config.status === 'active') {
        setupEventForwarding();
      }

      debugLog('Pigxel ready');
    } catch (error) {
      handleError(error, 'init');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
