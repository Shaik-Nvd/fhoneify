/**
 * Live verification of production admin authentication.
 *
 *   npm run admin:verify-production              # checks that need no credentials
 *   npm run admin:verify-production -- --login   # also tests a real admin login
 *
 * With --login, the username is asked for normally and the password with input
 * hidden (or both are read from ADMIN_LIVE_USERNAME / ADMIN_LIVE_PASSWORD).
 * Prints only status codes and pass/fail; never credentials, tokens, or
 * response bodies that contain them. Uses at most 5 calls on /api/auth
 * (production limit: 20 per 15 minutes per IP).
 *
 * Target: PRODUCTION_API_URL, default https://fhoneify-api.onrender.com
 */
import crypto from 'crypto';
import readline from 'readline';
import jwt from 'jsonwebtoken';

const API = (process.env.PRODUCTION_API_URL || 'https://fhoneify-api.onrender.com').replace(/\/$/, '');

function ask(prompt: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(prompt);
    if (hidden) (rl as any)._writeToOutput = () => {};
    rl.question('', (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function call(method: string, path: string, opts: { token?: string; body?: any; raw?: string } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: AbortSignal.timeout(90000),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

const results: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (${detail})`);
};

(async () => {
  if (process.argv.includes('--login') && !(process.env.ADMIN_LIVE_USERNAME && process.env.ADMIN_LIVE_PASSWORD)) {
    if (!process.stdin.isTTY) {
      console.error('--login needs an interactive terminal, or ADMIN_LIVE_USERNAME and ADMIN_LIVE_PASSWORD in the environment.');
      process.exit(1);
    }
    process.env.ADMIN_LIVE_USERNAME = await ask('Admin username: ', false);
    process.env.ADMIN_LIVE_PASSWORD = await ask('Admin password (hidden): ', true);
  }
  console.log(`Target: ${API}\n`);

  const health = await call('GET', '/health');
  check('API reachable', health.status === 200, `GET /health -> ${health.status}`);

  // --- deployment fingerprint: only the new commit behaves like this ---------
  const malformed = await call('POST', '/api/auth/admin/login', { raw: '{"username": "x", "password": ' });
  check('FINGERPRINT malformed JSON -> 400 (old code returned 500)', malformed.status === 400, `status ${malformed.status}, error="${malformed.json?.error}"`);

  const oversized = await call('POST', '/api/auth/admin/login', { body: { username: 'x', password: 'a'.repeat(300) } });
  check('FINGERPRINT oversized password -> 400 (old code returned 401)', oversized.status === 400, `status ${oversized.status}`);

  // --- login rejection -------------------------------------------------------
  const randomUser = `nobody-${crypto.randomBytes(6).toString('hex')}`;
  const wrongUser = await call('POST', '/api/auth/admin/login', { body: { username: randomUser, password: crypto.randomBytes(12).toString('hex') } });
  check('wrong username -> 401', wrongUser.status === 401 && !wrongUser.json?.data, `status ${wrongUser.status}`);

  const configuredUser = process.env.ADMIN_LIVE_USERNAME || process.env.ADMIN_USERNAME || 'admin';
  const wrongPw = await call('POST', '/api/auth/admin/login', { body: { username: configuredUser, password: crypto.randomBytes(12).toString('hex') } });
  check('wrong password -> 401', wrongPw.status === 401 && !wrongPw.json?.data, `status ${wrongPw.status}`);

  // --- authorization without credentials --------------------------------------
  const noToken = await call('GET', '/api/admin/users');
  check('unauthenticated admin API -> 401', noToken.status === 401, `status ${noToken.status}`);

  const noTokenInv = await call('GET', '/api/inventory');
  check('unauthenticated inventory API -> 401', noTokenInv.status === 401, `status ${noTokenInv.status}`);

  const randomSecretToken = jwt.sign({ userId: 'u-admin', role: 'admin' }, crypto.randomBytes(32).toString('hex'), { expiresIn: '15m' });
  const forgedSecret = await call('GET', '/api/admin/users', { token: randomSecretToken });
  check('admin token signed with an unknown secret -> 401', forgedSecret.status === 401, `status ${forgedSecret.status}`);

  const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ userId: 'u-admin', role: 'admin' })).toString('base64url');
  const algNone = await call('GET', '/api/admin/users', { token: `${h}.${p}.` });
  check('alg=none admin token -> 401', algNone.status === 401, `status ${algNone.status}`);

  const garbage = await call('GET', '/api/admin/users', { token: 'not.a.jwt' });
  check('garbage token -> 401', garbage.status === 401, `status ${garbage.status}`);

  // --- tokens that need the production signing secret -------------------------
  // Only meaningful if the local JWT_SECRET equals production's. A 401 on the
  // "genuine buyer token" means the secrets differ and these tests cannot run.
  if (process.env.JWT_SECRET) {
    const buyer = jwt.sign({ userId: 'u-buyer', role: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
    const buyerRes = await call('GET', '/api/admin/users', { token: buyer });
    if (buyerRes.status === 401) {
      console.log('INFO  local JWT_SECRET does not match production - signed-token tests skipped (this is the correct, safe configuration)');
    } else {
      console.log('WARN  local JWT_SECRET MATCHES production - anyone with this dev machine\'s .env can mint production tokens; rotate JWT_SECRET');
      check('non-admin (buyer) token -> 403', buyerRes.status === 403, `status ${buyerRes.status}`);

      const forgedRole = jwt.sign({ userId: 'u-buyer', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
      const forgedRes = await call('GET', '/api/admin/users', { token: forgedRole });
      check('buyer token with forged role=admin claim -> 403', forgedRes.status === 403, `status ${forgedRes.status}`);

      const refreshAsAccess = jwt.sign({ userId: 'u-admin', tokenType: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
      const rr = await call('GET', '/api/admin/users', { token: refreshAsAccess });
      check('refresh-type token used as access token -> 401', rr.status === 401, `status ${rr.status}`);

      const expired = jwt.sign({ userId: 'u-buyer', role: 'buyer', iat: Math.floor(Date.now() / 1000) - 3600 }, process.env.JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
      const ex = await call('GET', '/api/admin/users', { token: expired });
      check('expired token -> 401', ex.status === 401, `status ${ex.status}`);
    }
  }

  // --- real admin login (only if credentials are supplied via env) ------------
  if (process.env.ADMIN_LIVE_USERNAME && process.env.ADMIN_LIVE_PASSWORD) {
    const login = await call('POST', '/api/auth/admin/login', { body: { username: process.env.ADMIN_LIVE_USERNAME, password: process.env.ADMIN_LIVE_PASSWORD } });
    check('valid admin login -> 200', login.status === 200, `status ${login.status}`);
    if (login.status === 200) {
      const access = login.json.data.accessToken as string;
      const refresh = login.json.data.refreshToken as string;
      const bodyText = JSON.stringify(login.json);
      check('login response has no password/hash', !/password/i.test(bodyText) && !bodyText.includes('scrypt$'), 'checked');
      check('issued role is admin', login.json.data.user?.role === 'admin', `role ${login.json.data.user?.role}`);
      const d: any = jwt.decode(access);
      check('access token expires in 15 minutes', d && d.exp - d.iat === 900, `lifetime ${d ? d.exp - d.iat : '?'}s`);
      check('access token carries a unique jti', !!d?.jti, 'checked');
      const users = await call('GET', '/api/admin/users', { token: access });
      check('admin can call /api/admin/users', users.status === 200, `status ${users.status}`);
      const leads = await call('GET', '/api/admin/leads', { token: access });
      check('admin can call /api/admin/leads (dashboard data)', leads.status === 200, `status ${leads.status}`);
      const tampered = access.slice(0, -4) + (access.endsWith('AAAA') ? 'BBBB' : 'AAAA');
      const tr = await call('GET', '/api/admin/users', { token: tampered });
      check('tampered admin token -> 401', tr.status === 401, `status ${tr.status}`);
      const rr = await call('GET', '/api/admin/users', { token: refresh });
      check('real refresh token used as access token -> 401', rr.status === 401, `status ${rr.status}`);
    }
  } else {
    console.log('INFO  ADMIN_LIVE_USERNAME/ADMIN_LIVE_PASSWORD not provided - valid-login tests not run');
  }

  const failedCount = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failedCount}/${results.length} live checks passed.`);
  process.exit(failedCount ? 1 : 0);
})().catch((e) => {
  console.error('live verify error:', e.message);
  process.exit(1);
});
