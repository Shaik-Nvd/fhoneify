/**
 * Admin authentication & authorization tests.
 *
 * Boots the REAL Express app (server/server.ts) on a local port and exercises
 * it over HTTP, plus a static security sweep of the source tree.
 *
 * Isolation: every secret is generated fresh for this run (JWT secret, admin
 * password), and DATABASE_URL points at an unreachable local address, so this
 * suite cannot touch production data or use production credentials.
 *
 * Run: npm run test:auth
 */
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { pathToFileURL } from 'url';
import jwt from 'jsonwebtoken';

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

const ROOT = path.join(__dirname, '..', '..');

/**
 * Loads a server module by path at runtime. The specifier is deliberately
 * computed rather than a string literal: `next build` type-checks everything
 * under scripts/, and a literal import of server/server.ts would pull the whole
 * API graph (including unrelated pre-existing type errors) into the frontend
 * production build. The runtime module is exactly the same.
 */
function loadServerModule(rel: string): Promise<any> {
  const abs = path.join(ROOT, rel);
  return import(pathToFileURL(abs).href);
}

async function main() {
  // ---- isolated environment, set BEFORE the app is imported ----------------
  const TEST_SECRET = crypto.randomBytes(48).toString('hex');
  const TEST_USERNAME = `admin-${crypto.randomBytes(4).toString('hex')}`;
  const TEST_PASSWORD = crypto.randomBytes(18).toString('base64url');
  const port = await freePort();

  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.PORT = String(port);
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_EXPIRY = '15m';
  process.env.REFRESH_TOKEN_EXPIRY = '7d';
  process.env.DATABASE_URL = 'postgresql://nobody:nothing@127.0.0.1:1/unreachable';
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.ADMIN_USERNAME = TEST_USERNAME;
  delete process.env.ADMIN_PASSWORD;

  const { hashPassword, verifyPassword, parsePasswordHash } = await import('../../server/lib/password');
  const TEST_HASH = await hashPassword(TEST_PASSWORD);
  process.env.ADMIN_PASSWORD_HASH = TEST_HASH;

  await loadServerModule('server/server.ts');
  const authService = await loadServerModule('server/modules/auth/service.ts');
  const API = `http://127.0.0.1:${port}`;

  // Wait for the listener.
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  async function call(method: string, p: string, opts: { token?: string; body?: any; raw?: string } = {}) {
    const res = await fetch(API + p, {
      method,
      headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  }

  const leakCheck = (text: string) => {
    assert.ok(!text.includes(TEST_PASSWORD), 'response must never contain the password');
    assert.ok(!text.includes(TEST_HASH), 'response must never contain the password hash');
    assert.ok(!/password/i.test(text), 'response must not include any password field');
  };

  // ==========================================================================
  console.log('\n=== Password hashing ===\n');
  // ==========================================================================

  await test('hash is scrypt with a random salt; the plaintext never appears in it', async () => {
    const h1 = await hashPassword('correct horse battery staple');
    const h2 = await hashPassword('correct horse battery staple');
    assert.match(h1, /^scrypt\$32768\$8\$1\$/);
    assert.notEqual(h1, h2, 'two hashes of the same password must differ (random salt)');
    assert.ok(!h1.includes('correct horse'));
    assert.ok(parsePasswordHash(h1));
  });

  await test('verify accepts the right password and rejects wrong, empty and malformed input', async () => {
    const h = await hashPassword('s3cret-value-long-enough');
    assert.equal(await verifyPassword('s3cret-value-long-enough', h), true);
    assert.equal(await verifyPassword('s3cret-value-long-enougH', h), false);
    assert.equal(await verifyPassword('', h), false);
    assert.equal(await verifyPassword('s3cret-value-long-enough', 'not-a-hash'), false);
    assert.equal(await verifyPassword('s3cret-value-long-enough', 's3cret-value-long-enough'), false, 'a plaintext value is not a valid hash');
  });

  await test('hostile cost parameters in a hash string are refused, not executed', async () => {
    const h = await hashPassword('whatever-password-123');
    const hostile = h.replace('scrypt$32768$', 'scrypt$1073741824$');
    assert.equal(parsePasswordHash(hostile), null);
    assert.equal(await verifyPassword('whatever-password-123', hostile), false);
  });

  // ==========================================================================
  console.log('\n=== Admin login (HTTP) ===\n');
  // ==========================================================================

  let accessToken = '';
  let refreshToken = '';

  await test('correct credentials -> 200 with an admin session, no credential material in the response', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: { username: TEST_USERNAME, password: TEST_PASSWORD } });
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    assert.equal(r.json.data.user.role, 'admin');
    accessToken = r.json.data.accessToken;
    refreshToken = r.json.data.refreshToken;
    assert.ok(accessToken && refreshToken);
    leakCheck(r.text);

    const decoded: any = jwt.verify(accessToken, TEST_SECRET, { algorithms: ['HS256'] });
    assert.equal(decoded.role, 'admin');
    assert.equal(decoded.exp - decoded.iat, 15 * 60, 'access token must expire after 15 minutes');
  });

  await test('wrong password -> 401, generic message', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: { username: TEST_USERNAME, password: TEST_PASSWORD + 'x' } });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'Invalid admin credentials');
    assert.equal(r.json.data, undefined, 'no token on failure');
  });

  await test('wrong username -> 401 with the SAME message (no username enumeration)', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: { username: TEST_USERNAME + 'x', password: TEST_PASSWORD } });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'Invalid admin credentials');
  });

  await test('missing credentials -> 400', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: {} });
    assert.equal(r.status, 400);
    assert.equal(r.json.data, undefined);
  });

  await test('malformed JSON body -> 400 (not 500), no token', async () => {
    const r = await call('POST', '/api/auth/admin/login', { raw: '{"username": "x", "password": ' });
    assert.equal(r.status, 400);
    assert.ok(!r.text.includes('accessToken'));
  });

  await test('wrong types (username as number/object) -> 400', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: { username: 12345, password: { $ne: '' } } });
    assert.equal(r.status, 400);
  });

  await test('oversized password -> 400 before any hashing', async () => {
    const r = await call('POST', '/api/auth/admin/login', { body: { username: TEST_USERNAME, password: 'a'.repeat(300) } });
    assert.equal(r.status, 400);
  });

  // ==========================================================================
  console.log('\n=== Admin login (service-level configuration safety) ===\n');
  // ==========================================================================

  await test('no hash configured -> admin login disabled even with the right password', async () => {
    const saved = process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH;
    try {
      assert.equal(await authService.adminLoginWithPassword(TEST_USERNAME, TEST_PASSWORD), null);
    } finally {
      process.env.ADMIN_PASSWORD_HASH = saved;
    }
  });

  await test('legacy plaintext ADMIN_PASSWORD is ignored - it can never log anyone in', async () => {
    const saved = process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    try {
      assert.equal(await authService.adminLoginWithPassword(TEST_USERNAME, TEST_PASSWORD), null);
    } finally {
      process.env.ADMIN_PASSWORD_HASH = saved;
      delete process.env.ADMIN_PASSWORD;
    }
  });

  await test('a plaintext password put in ADMIN_PASSWORD_HASH by mistake does not work', async () => {
    const saved = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = TEST_PASSWORD;
    try {
      assert.equal(await authService.adminLoginWithPassword(TEST_USERNAME, TEST_PASSWORD), null);
    } finally {
      process.env.ADMIN_PASSWORD_HASH = saved;
    }
  });

  await test('no username configured -> admin login disabled', async () => {
    const saved = process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_USERNAME;
    try {
      assert.equal(await authService.adminLoginWithPassword('', TEST_PASSWORD), null);
    } finally {
      process.env.ADMIN_USERNAME = saved;
    }
  });

  await test('empty-string username/password never match an unconfigured admin', async () => {
    assert.equal(await authService.adminLoginWithPassword('', ''), null);
  });

  // ==========================================================================
  console.log('\n=== Authorization on admin endpoints ===\n');
  // ==========================================================================

  await test('unauthenticated request -> 401', async () => {
    const r = await call('GET', '/api/admin/users');
    assert.equal(r.status, 401);
  });

  await test('authenticated admin -> 200 on admin endpoints', async () => {
    const r1 = await call('GET', '/api/admin/users', { token: accessToken });
    assert.equal(r1.status, 200);
    const r2 = await call('GET', '/api/admin/analytics', { token: accessToken });
    assert.equal(r2.status, 200);
    leakCheck(r1.text);
  });

  await test('normal authenticated user (buyer) -> 403', async () => {
    const buyer = jwt.sign({ userId: 'u-buyer', role: 'buyer' }, TEST_SECRET, { expiresIn: '15m' });
    const r = await call('GET', '/api/admin/users', { token: buyer });
    assert.equal(r.status, 403);
  });

  await test('FORGED ROLE: a validly-signed token claiming role=admin for a buyer -> 403 (role comes from the server)', async () => {
    const forged = jwt.sign({ userId: 'u-buyer', role: 'admin' }, TEST_SECRET, { expiresIn: '15m' });
    const r = await call('GET', '/api/admin/users', { token: forged });
    assert.equal(r.status, 403);
  });

  await test('FORGED ROLE: unknown user id with role=admin claim -> 403', async () => {
    const forged = jwt.sign({ userId: 'u-does-not-exist', role: 'admin' }, TEST_SECRET, { expiresIn: '15m' });
    const r = await call('GET', '/api/admin/users', { token: forged });
    assert.equal(r.status, 403);
  });

  // Tokens minted directly with the test secret, so the tests below never pass
  // vacuously just because login failed and a token is empty.
  const mintedAdmin = jwt.sign({ userId: 'u-admin', role: 'admin' }, TEST_SECRET, { expiresIn: '15m' });
  const mintedRefresh = jwt.sign({ userId: 'u-admin', tokenType: 'refresh' }, TEST_SECRET, { expiresIn: '7d' });

  await test('control: a genuine admin token is accepted (so the rejections below are meaningful)', async () => {
    const r = await call('GET', '/api/admin/users', { token: mintedAdmin });
    assert.equal(r.status, 200);
  });

  await test('TAMPERED token: payload edited, original signature kept -> 401', async () => {
    const [h, , s] = mintedAdmin.split('.');
    assert.ok(h && s);
    const payload = Buffer.from(JSON.stringify({ userId: 'u-admin', role: 'admin', exp: 9999999999 })).toString('base64url');
    const r = await call('GET', '/api/admin/users', { token: `${h}.${payload}.${s}` });
    assert.equal(r.status, 401);
  });

  await test('TAMPERED token: signature changed -> 401', async () => {
    const t = mintedAdmin.slice(0, -4) + (mintedAdmin.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    const r = await call('GET', '/api/admin/users', { token: t });
    assert.equal(r.status, 401);
  });

  await test('token signed with a different secret -> 401', async () => {
    const t = jwt.sign({ userId: 'u-admin', role: 'admin' }, 'some-other-secret', { expiresIn: '15m' });
    const r = await call('GET', '/api/admin/users', { token: t });
    assert.equal(r.status, 401);
  });

  await test('alg=none token -> 401', async () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ userId: 'u-admin', role: 'admin' })).toString('base64url');
    const r = await call('GET', '/api/admin/users', { token: `${h}.${p}.` });
    assert.equal(r.status, 401);
  });

  await test('EXPIRED admin token -> 401', async () => {
    const t = jwt.sign({ userId: 'u-admin', role: 'admin', iat: Math.floor(Date.now() / 1000) - 3600 }, TEST_SECRET, { expiresIn: '15m' });
    const r = await call('GET', '/api/admin/users', { token: t });
    assert.equal(r.status, 401);
  });

  await test('garbage / non-Bearer authorization -> 401', async () => {
    const r1 = await call('GET', '/api/admin/users', { token: 'not-a-jwt' });
    assert.equal(r1.status, 401);
    const res = await fetch(`${API}/api/admin/users`, { headers: { Authorization: `Basic ${mintedAdmin}` } });
    assert.equal(res.status, 401);
  });

  await test('REFRESH token used as an access token -> 401 (7-day token cannot bypass 15-minute expiry)', async () => {
    const r = await call('GET', '/api/admin/users', { token: mintedRefresh });
    assert.equal(r.status, 401);
    if (refreshToken) {
      const r2 = await call('GET', '/api/admin/users', { token: refreshToken });
      assert.equal(r2.status, 401, 'the refresh token issued by login is also rejected as an access token');
    }
  });

  await test('ACCESS token cannot be exchanged at /refresh -> 401', async () => {
    assert.ok(accessToken, 'login must have issued an access token');
    const r = await call('POST', '/api/auth/refresh', { body: { refreshToken: accessToken } });
    assert.equal(r.status, 401);
  });

  await test('two logins/refreshes in the same second never produce identical tokens (unique jti)', async () => {
    const a = await authService.adminLoginWithPassword(TEST_USERNAME, TEST_PASSWORD);
    const b = await authService.adminLoginWithPassword(TEST_USERNAME, TEST_PASSWORD);
    assert.ok(a && b);
    assert.notEqual(a!.refreshToken, b!.refreshToken);
    assert.notEqual(a!.accessToken, b!.accessToken);
    assert.ok((jwt.decode(a!.accessToken) as any).jti, 'tokens must carry a jti');
  });

  await test('valid refresh -> new admin access token that works; the old refresh token is revoked', async () => {
    const r = await call('POST', '/api/auth/refresh', { body: { refreshToken } });
    assert.equal(r.status, 200);
    const again = await call('GET', '/api/admin/users', { token: r.json.data.accessToken });
    assert.equal(again.status, 200);
    const reuse = await authService.refreshTokens(refreshToken);
    assert.equal(reuse, null, 'a used refresh token must not be reusable');
  });

  await test('other admin-only areas also reject a buyer (inventory, CMS write, reference prices)', async () => {
    const buyer = jwt.sign({ userId: 'u-buyer', role: 'buyer' }, TEST_SECRET, { expiresIn: '15m' });
    assert.equal((await call('GET', '/api/inventory', { token: buyer })).status, 403);
    assert.equal((await call('POST', '/api/cms/posts', { token: buyer, body: { title: 'x' } })).status, 403);
    assert.equal((await call('GET', '/api/admin/reference-prices/status', { token: buyer })).status, 403);
    assert.equal((await call('GET', '/api/inventory')).status, 401);
  });

  // ==========================================================================
  console.log('\n=== OTP cannot produce an admin session ===\n');
  // ==========================================================================

  await test('OTP login for the admin account\'s phone is refused (no password-less admin)', async () => {
    const { users } = await loadServerModule('server/data.ts');
    const admin = users.find((u: any) => u.role === 'admin')!;
    const result = await authService.generateTokensForUser(admin.phone);
    assert.equal(result, null);
  });

  await test('OTP login for a normal user still works and yields a non-admin role', async () => {
    const result = await authService.generateTokensForUser('9876543210');
    assert.ok(result);
    assert.notEqual(result!.user.role, 'admin');
  });

  // ==========================================================================
  console.log('\n=== Static security sweep of the source tree ===\n');
  // ==========================================================================

  const SOURCE_DIRS = ['server', 'app', 'lib', 'components'];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', 'data'].includes(entry.name)) walk(full);
      } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name) && entry.name !== 'seed_devices.ts') {
        files.push(full);
      }
    }
  };
  for (const d of SOURCE_DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
  const sources = files.map((f) => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }));
  const offenders = (re: RegExp, filter?: (file: string, line: string) => boolean) =>
    sources.flatMap(({ file, text }) =>
      text.split('\n').map((line, i) => ({ file, line: i + 1, text: line })).filter((l) => re.test(l.text) && (!filter || filter(l.file, l.text)))
    );

  await test(`scanned ${sources.length} source files`, () => {
    assert.ok(sources.length > 50);
  });

  await test('no hardcoded password / secret literals', () => {
    const hits = offenders(/\b(password|passwd|pwd|jwt_?secret|admin_?pass(word)?)\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i, (_f, l) => !/placeholder|type=|label|autoComplete/i.test(l));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('the plaintext ADMIN_PASSWORD env var is never compared against input', () => {
    const hits = offenders(/process\.env\.ADMIN_PASSWORD\b(?!_HASH)/, (_f, l) => !/if \(process\.env\.ADMIN_PASSWORD && !warnedAboutLegacyPlaintext\)/.test(l));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('no insecure JWT secret fallback', () => {
    const hits = offenders(/JWT_SECRET\s*(\|\||\?\?)/);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('no universal OTP / magic code backdoor', () => {
    const hits = offenders(/(otp|code)\s*(===|==)\s*['"`]\d{4,8}['"`]|['"`](123456|000000|111111|999999|1234)['"`]\s*(===|==|\))/i, (f) => f.startsWith('server'));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('no unverified token decoding on the server', () => {
    const hits = offenders(/jwt\.decode\(|ignoreExpiration\s*:\s*true/, (f) => f.startsWith('server'));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('no role taken from client-controlled request data on the server', () => {
    const hits = offenders(/req\.(body|query|headers|params)\s*(\.|\[)\s*['"]?role\b|role\s*[:=]\s*req\.(body|query|headers|params)/, (f) => f.startsWith('server'));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('no password value passed to a logger or console', () => {
    const hits = offenders(/(logger\.\w+|console\.\w+)\([^)]*\b(password|passwordHash|ADMIN_PASSWORD_HASH)\b\s*[,})\]]/, (_f, l) => !/'[^']*password[^']*'/i.test(l));
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  await test('admin credential env vars are never exposed to the browser bundle', () => {
    const hits = offenders(/NEXT_PUBLIC_[A-Z_]*(ADMIN|PASSWORD|JWT|SECRET)/);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`), []);
  });

  console.log(`\n${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('suite error:', e.message);
  process.exit(1);
});
