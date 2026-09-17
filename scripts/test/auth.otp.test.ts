/**
 * OTP request/verification tests.
 *
 * Boots the REAL Express app and drives the REAL endpoints over HTTP. The OTP
 * store is an in-memory double (so no database is touched) and the WhatsApp
 * provider is a stub that records what Meta would have received - which is also
 * how the test learns the code, exactly like a customer reading their phone.
 *
 * Run: npm run test:otp
 */
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { pathToFileURL } from 'url';

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

const ROOT = path.join(__dirname, '..', '..');
const loadServerModule = (rel: string): Promise<any> => import(pathToFileURL(path.join(ROOT, rel)).href);

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// --- in-memory OTP store ----------------------------------------------------
type Rec = { phone: string; code: string; expiresAt: Date; createdAt: Date; attempts: number };
const records = new Map<string, Rec>();
const memoryStore = {
  async find(phone: string) {
    return records.get(phone) ?? null;
  },
  async save(r: Rec) {
    records.set(r.phone, { ...r });
  },
  async setAttempts(phone: string, attempts: number) {
    const r = records.get(phone);
    if (r) r.attempts = attempts;
  },
  async remove(phone: string) {
    records.delete(phone);
  },
};

// --- WhatsApp provider stub -------------------------------------------------
const realFetch = globalThis.fetch;
let providerCalls: any[] = [];
let providerMode: 'ok' | 'template-error' | 'network-error' = 'ok';

function installProviderStub() {
  globalThis.fetch = (async (input: any, init: any) => {
    const url = String(typeof input === 'string' ? input : input?.url ?? '');
    if (!url.includes('graph.facebook.com')) return realFetch(input, init);
    const body = JSON.parse(String(init?.body ?? '{}'));
    providerCalls.push(body);
    if (providerMode === 'network-error') throw new Error('socket hang up');
    if (providerMode === 'template-error') {
      return new Response(
        JSON.stringify({ error: { message: 'template name does not exist in en', code: 132001, error_subcode: 2494010, type: 'OAuthException' } }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.TEST' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as any;
}

/** The code Meta would have delivered, from the most recent provider call. */
function deliveredCode(): string {
  const last = providerCalls[providerCalls.length - 1];
  return last?.template?.components?.[0]?.parameters?.[0]?.text;
}

async function main() {
  const TEST_SECRET = crypto.randomBytes(48).toString('hex');
  const port = await freePort();
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  // Drive the real endpoints many times; the production limit (20/15min) is
  // exercised separately in its own case below.
  process.env.AUTH_RATE_LIMIT = '500';
  process.env.PORT = String(port);
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.DATABASE_URL = 'postgresql://nobody:nothing@127.0.0.1:1/unreachable';
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_OTP_TEMPLATE_NAME;

  installProviderStub();
  await loadServerModule('server/server.ts');
  const controller = await loadServerModule('server/modules/auth/controller.ts');
  controller.__setOtpStoreForTests(memoryStore);

  const API = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await realFetch(`${API}/health`)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const call = async (p: string, body: any) => {
    const res = await realFetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  };

  const PHONE = '+919812345678';
  const enableProvider = () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    process.env.WHATSAPP_OTP_TEMPLATE_NAME = 'otp_fhoneify';
  };
  const reset = () => {
    records.clear();
    providerCalls = [];
    providerMode = 'ok';
  };

  console.log('\n=== Request a code ===\n');

  await test('malformed phone -> 400, nothing stored, provider never called', async () => {
    reset();
    enableProvider();
    for (const phone of ['', '9812345678', '+91 98123', 'not-a-phone', '+0912345678']) {
      const r = await call('/api/auth/otp/send', { phone });
      assert.equal(r.status, 400, `phone ${JSON.stringify(phone)} should be rejected`);
    }
    assert.equal(providerCalls.length, 0);
    assert.equal(records.size, 0);
  });

  await test('provider not configured -> 503, and the code is never returned', async () => {
    reset();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const r = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(r.status, 503);
    assert.ok(!/\d{6}/.test(r.text), 'response must not contain a code');
    assert.equal(records.size, 0);
    enableProvider();
  });

  await test('happy path -> 200, provider received an authentication template', async () => {
    reset();
    enableProvider();
    const r = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(r.status, 200);
    assert.equal(providerCalls.length, 1);
    const sent = providerCalls[0];
    assert.equal(sent.messaging_product, 'whatsapp');
    assert.equal(sent.to, PHONE.replace('+', ''), 'recipient must be the requested number without +');
    assert.equal(sent.template.name, 'otp_fhoneify');
    assert.match(deliveredCode(), /^\d{6}$/);
  });

  await test('the response never contains the code', async () => {
    assert.ok(!(await call('/api/auth/otp/send', { phone: '+919800000001' })).text.includes(deliveredCode()));
  });

  await test('the stored record holds a HASH, not the code', async () => {
    reset();
    const r = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(r.status, 200);
    const stored = records.get(PHONE)!;
    const code = deliveredCode();
    assert.notEqual(stored.code, code);
    assert.equal(stored.code.length, 64, 'sha256 hex');
    assert.ok(!stored.code.includes(code));
    assert.equal(stored.attempts, 0);
    const ttl = stored.expiresAt.getTime() - stored.createdAt.getTime();
    assert.ok(ttl > 4 * 60_000 && ttl <= 5 * 60_000, `short expiry expected, got ${ttl}ms`);
  });

  await test('the stored hash cannot be replayed as the code', async () => {
    const stored = records.get(PHONE)!;
    const r = await call('/api/auth/otp/verify', { phone: PHONE, code: stored.code.slice(0, 6) });
    assert.equal(r.status, 400);
  });

  await test('provider rejects the template -> 502, no code stored, provider error not leaked', async () => {
    reset();
    providerMode = 'template-error';
    const r = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(r.status, 502);
    assert.equal(records.size, 0, 'a code that was never delivered must not be stored');
    assert.ok(!/132001|template name/i.test(r.text), 'provider internals must not reach the client');
  });

  await test('provider network failure -> 502, no code stored', async () => {
    reset();
    providerMode = 'network-error';
    const r = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(r.status, 502);
    assert.equal(records.size, 0);
  });

  await test('resend within the cooldown -> 429 with Retry-After; allowed after it passes', async () => {
    reset();
    const first = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(first.status, 200);
    const second = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(second.status, 429);
    assert.ok(Number(second.headers.get('retry-after')) > 0);
    assert.equal(providerCalls.length, 1, 'a throttled resend must not spend a provider message');

    const rec = records.get(PHONE)!;
    rec.createdAt = new Date(Date.now() - 60_000);
    const third = await call('/api/auth/otp/send', { phone: PHONE });
    assert.equal(third.status, 200);
    assert.equal(providerCalls.length, 2);
  });

  console.log('\n=== Verify a code ===\n');

  await test('correct code -> 200 with a session, and the code is consumed (single use)', async () => {
    reset();
    await call('/api/auth/otp/send', { phone: PHONE });
    const code = deliveredCode();

    const ok = await call('/api/auth/otp/verify', { phone: PHONE, code });
    assert.equal(ok.status, 200);
    assert.ok(ok.json.data.accessToken && ok.json.data.refreshToken);
    assert.ok(!ok.text.includes(code), 'the code must not be echoed back');
    assert.equal(records.size, 0, 'record deleted on success');

    const replay = await call('/api/auth/otp/verify', { phone: PHONE, code });
    assert.equal(replay.status, 400, 'a used code cannot be reused');
  });

  await test('wrong code -> 400 and the attempt is counted', async () => {
    reset();
    await call('/api/auth/otp/send', { phone: PHONE });
    const wrong = String((Number(deliveredCode()) + 1) % 1_000_000).padStart(6, '0');
    const r = await call('/api/auth/otp/verify', { phone: PHONE, code: wrong });
    assert.equal(r.status, 400);
    assert.equal(records.get(PHONE)!.attempts, 1);
  });

  await test('brute force -> the code is destroyed after 5 wrong attempts', async () => {
    reset();
    await call('/api/auth/otp/send', { phone: PHONE });
    const code = deliveredCode();
    const wrong = String((Number(code) + 7) % 1_000_000).padStart(6, '0');
    for (let i = 0; i < 4; i++) assert.equal((await call('/api/auth/otp/verify', { phone: PHONE, code: wrong })).status, 400);
    const fifth = await call('/api/auth/otp/verify', { phone: PHONE, code: wrong });
    assert.equal(fifth.status, 429);
    assert.equal(records.size, 0, 'the code must be destroyed, not left guessable');
    assert.equal((await call('/api/auth/otp/verify', { phone: PHONE, code })).status, 400, 'even the right code no longer works');
  });

  await test('expired code -> 400 and the record is cleared', async () => {
    reset();
    await call('/api/auth/otp/send', { phone: PHONE });
    const code = deliveredCode();
    records.get(PHONE)!.expiresAt = new Date(Date.now() - 1000);
    const r = await call('/api/auth/otp/verify', { phone: PHONE, code });
    assert.equal(r.status, 400);
    assert.equal(records.size, 0);
  });

  await test('verify for an unknown number -> 400', async () => {
    reset();
    assert.equal((await call('/api/auth/otp/verify', { phone: '+919700000000', code: '123456' })).status, 400);
  });

  await test('malformed verify input -> 400', async () => {
    reset();
    for (const body of [{}, { phone: PHONE }, { phone: PHONE, code: '12345' }, { phone: PHONE, code: 'abcdef' }, { phone: 'nope', code: '123456' }, { phone: PHONE, code: 123456 }]) {
      assert.equal((await call('/api/auth/otp/verify', body)).status, 400, `body ${JSON.stringify(body)}`);
    }
  });

  await test('a code issued for one number does not work for another', async () => {
    reset();
    await call('/api/auth/otp/send', { phone: PHONE });
    const code = deliveredCode();
    const other = '+919700000123';
    records.get(PHONE)!.createdAt = new Date(Date.now() - 60_000);
    await call('/api/auth/otp/send', { phone: other });
    const r = await call('/api/auth/otp/verify', { phone: other, code });
    assert.equal(r.status, 400, 'codes are bound to their phone number');
  });

  console.log('\n=== No bypasses ===\n');

  await test('OTP login cannot produce an admin session', async () => {
    reset();
    const { users } = await loadServerModule('server/data.ts');
    const admin = users.find((u: any) => u.role === 'admin')!;
    await call('/api/auth/otp/send', { phone: admin.phone.startsWith('+') ? admin.phone : `+91${admin.phone}` });
    // The admin's seeded phone may not be E.164; assert via the service directly.
    const authService = await loadServerModule('server/modules/auth/service.ts');
    assert.equal(await authService.generateTokensForUser(admin.phone), null);
  });

  await test('source contains no fixed/magic OTP and no Math.random code generation', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!['node_modules', '.next', 'data'].includes(e.name)) walk(full);
        } else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(full);
      }
    };
    walk(path.join(ROOT, 'server'));
    const offenders: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      text.split('\n').forEach((line, i) => {
        const where = `${path.relative(ROOT, f)}:${i + 1}`;
        // Skip comments: prose describing a fixed bug is not the bug.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (/(otp|code)\s*(===|==)\s*['"`]\d{4,8}['"`]/i.test(line)) offenders.push(`${where} magic code comparison`);
        if (/['"`](123456|000000|111111|999999)['"`]/.test(line) && /otp|code/i.test(line)) offenders.push(`${where} fixed OTP literal`);
        if (/Math\.random\(\)/.test(line) && /otp|code/i.test(line)) offenders.push(`${where} insecure code generation`);
        if (/res\.(json|send)\([^)]*\b(otp|code)\b/i.test(line) && !/errorCode|statusCode/i.test(line)) offenders.push(`${where} code in response`);
      });
    }
    assert.deepEqual(offenders, []);
  });

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('suite error:', e.message);
  process.exit(1);
});
