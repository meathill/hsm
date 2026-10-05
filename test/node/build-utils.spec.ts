import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, buildHeadersFile, buildSitemapXml, resolveSiteUrl } from '../../scripts/build.mjs';

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

describe('buildSitemapXml', () => {
  it('仅包含 HTML 页面，不含 AI/MCP 静态文件', () => {
    const xml = buildSitemapXml('https://hsm.meathill.com', '2026-10-05');
    expect(xml).toContain('https://hsm.meathill.com/');
    expect(xml).toContain('https://hsm.meathill.com/en/');
    expect(xml).not.toContain('/llms.txt');
    expect(xml).not.toContain('/SKILL.md');
    expect(xml).not.toContain('/mcp.json');
    expect(xml).not.toContain('/.well-known/mcp.json');
  });
});

describe('buildHeadersFile', () => {
  it('为 HTML 声明 charset=utf-8', () => {
    const headers = buildHeadersFile();
    expect(headers).toContain('Content-Type: text/html; charset=utf-8');
    expect(headers).toContain('Content-Type: text/plain; charset=utf-8');
  });
});
