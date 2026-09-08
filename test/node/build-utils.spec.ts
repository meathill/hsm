import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, resolveSiteUrl } from '../../scripts/build.mjs';

describe('resolveSiteUrl', () => {
  it('无域名时回退默认站', () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl('')).toBe(DEFAULT_SITE_URL);
  });

  it('裸域名自动补 https', () => {
    expect(resolveSiteUrl('hsm.example.com')).toBe('https://hsm.example.com');
  });

  it('完整 URL 原样透传', () => {
    expect(resolveSiteUrl('https://hsm.example.com')).toBe('https://hsm.example.com');
    expect(resolveSiteUrl('http://localhost:8787')).toBe('http://localhost:8787');
  });
});
