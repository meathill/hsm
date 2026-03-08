import { describe, expect, it } from 'vitest';
import { COMMENT_THREAD_ID, GOOGLE_ANALYTICS_ID, LANGS, renderSiteHtml } from '../scripts/site-template.mjs';

describe('site template', () => {
  const siteUrl = 'https://hsm.example.com';
  const sampleHtml = '<h1>Sample</h1><p>Body</p>';

  it('为中文页面注入 GA、个人站链接与评论区', () => {
    const html = renderSiteHtml(LANGS[0], siteUrl, sampleHtml);

    expect(html).toContain(`googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`);
    expect(html).toContain(`gtag('config', '${GOOGLE_ANALYTICS_ID}')`);
    expect(html).toContain('href="https://meathill.com"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('>meathill.com<');
    expect(html).toContain('id="comments-title"');
    expect(html).toContain('>评论<');
    expect(html).toContain(`data-thread-id="${COMMENT_THREAD_ID}"`);
    expect(html).toContain(`"postId":"${COMMENT_THREAD_ID}"`);
    expect(html).toContain('"url": "https://meathill.com"');
  });

  it('为英文页面注入英文评论标题并复用同一线程', () => {
    const html = renderSiteHtml(LANGS[1], siteUrl, sampleHtml);

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('>Comments<');
    expect(html).toContain(`"postId":"${COMMENT_THREAD_ID}"`);
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('href="https://meathill.com"');
    expect(html).toContain('"url": "https://meathill.com"');
  });
});
