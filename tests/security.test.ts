import { validateUrl, isPrivateIp, sanitizeFilename, generateJobId } from '../src/lib/security';

describe('Vidnoria Security & URL Validation', () => {
  test('validates supported YouTube URLs', () => {
    const res1 = validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res1.valid).toBe(true);
    expect(res1.platform).toBe('youtube');

    const res2 = validateUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(res2.valid).toBe(true);
    expect(res2.platform).toBe('youtube');
  });

  test('validates supported Instagram URLs', () => {
    const res = validateUrl('https://www.instagram.com/reel/C123456789/');
    expect(res.valid).toBe(true);
    expect(res.platform).toBe('instagram');
  });

  test('validates supported TikTok URLs', () => {
    const res = validateUrl('https://www.tiktok.com/@user/video/7123456789012345678');
    expect(res.valid).toBe(true);
    expect(res.platform).toBe('tiktok');
  });

  test('blocks invalid and malicious URLs', () => {
    expect(validateUrl('not-a-url').valid).toBe(false);
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateUrl('https://example.com/unsupported').valid).toBe(false);
  });

  test('SSRF protection blocks private and localhost IPs', () => {
    expect(isPrivateIp('localhost')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('youtube.com')).toBe(false);
  });

  test('sanitizes filenames safely', () => {
    const safe = sanitizeFilename('../../etc/passwd.mp4');
    expect(safe).not.toContain('/');
    expect(safe).not.toContain('\\');
  });

  test('generates valid job ids', () => {
    const id = generateJobId();
    expect(id.startsWith('vid_')).toBe(true);
  });
});
