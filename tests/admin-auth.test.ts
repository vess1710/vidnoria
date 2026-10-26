import {
  createSessionToken,
  verifySessionToken,
  checkAdminPassword,
  isAdminAuthenticated,
  getAdminCorsHeaders,
} from '../src/lib/admin/auth';

declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (val: any) => any;

describe('Admin Authentication & Session Token Security', () => {
  test('checkAdminPassword accepts standard dev and secure admin passwords', () => {
    expect(checkAdminPassword('dev-admin-password')).toBe(true);
    expect(checkAdminPassword('VidnoriaSecure2026!')).toBe(true);
    expect(checkAdminPassword('ChangeThisToAStrongSecretPassword2026!')).toBe(true);
    expect(checkAdminPassword('wrong-password')).toBe(false);
    expect(checkAdminPassword('')).toBe(false);
  });

  test('createSessionToken creates a signed token in correct format', () => {
    const token = createSessionToken();
    expect(typeof token).toBe('string');
    const parts = token.split(':');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('admin');
    const expiresAt = parseInt(parts[1], 10);
    expect(expiresAt > Date.now()).toBe(true);
  });

  test('verifySessionToken validates legitimate tokens and rejects invalid or tampered ones', () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);

    // Tampered signature
    const tampered = token.slice(0, -4) + 'abcd';
    expect(verifySessionToken(tampered)).toBe(false);

    // Tampered payload
    const parts = token.split(':');
    const tamperedPayload = `user:${parts[1]}:${parts[2]}`;
    expect(verifySessionToken(tamperedPayload)).toBe(false);

    // Expired timestamp
    const expiredTimestamp = Date.now() - 10000;
    const expiredPayload = `admin:${expiredTimestamp}:fake`;
    expect(verifySessionToken(expiredPayload)).toBe(false);
  });

  test('isAdminAuthenticated accepts Bearer token in Authorization header', async () => {
    const token = createSessionToken();
    const req = new Request('https://vidnoria.com/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const isAuth = await isAdminAuthenticated(req);
    expect(isAuth).toBe(true);
  });

  test('isAdminAuthenticated accepts vidnoria_admin_session in Cookie header', async () => {
    const token = createSessionToken();
    const req = new Request('http://localhost:3000/api/admin/stats', {
      headers: {
        Cookie: `vidnoria_admin_session=${token}; other=value`,
      },
    });

    const isAuth = await isAdminAuthenticated(req);
    expect(isAuth).toBe(true);
  });

  test('isAdminAuthenticated rejects unauthenticated requests', async () => {
    const req = new Request('http://localhost:3000/api/admin/stats');
    const isAuth = await isAdminAuthenticated(req);
    expect(isAuth).toBe(false);
  });

  test('getAdminCorsHeaders sets appropriate cross-origin and credentials headers', () => {
    const req = new Request('http://localhost:3000/api/admin/auth', {
      headers: { origin: 'https://vidnoria.com' },
    });
    const headers = getAdminCorsHeaders(req);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://vidnoria.com');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});
