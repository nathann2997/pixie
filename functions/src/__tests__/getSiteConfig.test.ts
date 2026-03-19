/**
 * Tests for getSiteConfig Cloud Function
 *
 * Approach: Mock firebase-admin and firebase-functions, then test the
 * exported function's handler directly by simulating Express req/res.
 */

// Must mock before any imports
jest.mock('firebase-admin', () => {
  const getMock = jest.fn();
  const docMock = jest.fn(() => ({ get: getMock }));
  const collectionMock = jest.fn(() => ({ doc: docMock }));
  const firestoreMock = jest.fn(() => ({ collection: collectionMock }));

  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(firestoreMock, {
      Timestamp: { now: jest.fn() },
      FieldValue: { serverTimestamp: jest.fn() },
    }),
  };
});

jest.mock('firebase-functions/v2', () => ({
  https: {
    onRequest: jest.fn((_opts: unknown, handler: Function) => handler),
    onCall: jest.fn((_opts: unknown, handler: Function) => handler),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn(() => ({ value: jest.fn(() => '') })),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn() },
}));

jest.mock('playwright-core', () => ({
  chromium: { launch: jest.fn() },
}));

jest.mock('@sparticuz/chromium', () => ({
  default: { executablePath: jest.fn(), args: [] },
  __esModule: true,
}));

// Also mock all the AI submodules to prevent their initialization from failing
jest.mock('../ai/scrapeUrl', () => ({ scrapeAndMinifyUrl: jest.fn() }));
jest.mock('../ai/analyzeWebsite', () => ({ analyzeWebsiteWithAI: jest.fn() }));
jest.mock('../ai/generatePlan', () => ({ generateTrackingPlan: jest.fn() }));
jest.mock('../ai/updateDraftPlan', () => ({ updateDraftPlan: jest.fn() }));
jest.mock('../ai/applyConfig', () => ({ applyTrackingConfig: jest.fn() }));
jest.mock('../ai/eventBuilderChat', () => ({ eventBuilderChat: jest.fn() }));
jest.mock('../ai/browser', () => ({
  getBrowserLaunchOptions: jest.fn(),
  setupRouteBlocking: jest.fn(),
  scrapeAndMinify: jest.fn(),
  scrapeAndAudit: jest.fn(),
}));

import * as admin from 'firebase-admin';

// Helper to create mock req/res
function mockReq(query: Record<string, string> = {}, headers: Record<string, string> = {}) {
  return { query, headers, method: 'GET', body: {}, get: jest.fn((h: string) => headers[h]) } as any;
}

function mockRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('getSiteConfig', () => {
  let handler: Function;
  let firestoreGetMock: jest.Mock;

  beforeAll(async () => {
    // Import after mocks are set up — onRequest returns the handler directly
    const mod = await import('../index');
    handler = mod.getSiteConfig as unknown as Function;

    const db = admin.firestore();
    firestoreGetMock = (db.collection('sites').doc('any') as any).get;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 for missing site ID', async () => {
    const req = mockReq({});
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('returns 400 for invalid site ID format', async () => {
    const req = mockReq({ id: '<script>alert(1)</script>' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 for non-existent site', async () => {
    firestoreGetMock.mockResolvedValueOnce({ exists: false });
    const req = mockReq({ id: 'nonexistent-site' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns empty config for pending site', async () => {
    firestoreGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        url: 'https://example.com',
        status: 'pending',
        trackingConfig: { pixels: { ga4: 'G-123' }, events: [] },
      }),
    });
    const req = mockReq({ id: 'pending-site' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', pixels: {}, events: [] })
    );
  });

  test('returns full config for active site', async () => {
    const trackingConfig = {
      pixels: { ga4: 'G-123' },
      events: [{ selector: '#btn', trigger: 'click', platform: 'ga4', event_name: 'purchase' }],
    };
    firestoreGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ url: 'https://example.com', status: 'active', trackingConfig }),
    });
    const req = mockReq({ id: 'active-site' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', pixels: { ga4: 'G-123' } })
    );
  });

  test('returns empty config for paused site', async () => {
    firestoreGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        url: 'https://example.com',
        status: 'paused',
        trackingConfig: { pixels: { ga4: 'G-123' }, events: [] },
      }),
    });
    const req = mockReq({ id: 'paused-site' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paused', pixels: {}, events: [] })
    );
  });
});
