import { describe, expect, it } from 'vitest';
import { COMMENT_THREAD_ID, GOOGLE_ANALYTICS_ID, LANGS, renderSiteHtml } from '../scripts/site-template.mjs';

describe('site template', () => {
  const siteUrl = 'https://hsm.example.com';
  const sampleHtml = '<h1>Sample</h1><p>Body</p>';

  it('为中文页面注入品牌网络、GA 与评论区', () => {
    const html = renderSiteHtml(LANGS[0], siteUrl, sampleHtml);

    expect(html).toContain(`googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`);
    expect(html).toContain(`gtag('config', '${GOOGLE_ANALYTICS_ID}')`);
    expect(html).toContain('href="https://meathill.com"');
    expect(html).toContain('>Meathill Studio<');
    expect(html).toContain('href="/brand.css"');
    expect(html).toContain('>产品网络<');
    expect(html).toContain('href="https://meathill.com/app"');
    expect(html).not.toContain('cdn.tailwindcss.com');
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
    expect(html).toContain('>Product network<');
  });

  it('输出合法的 JSON-LD：SoftwareApplication 无非法属性，并用 SoftwareSourceCode 承载仓库信息', () => {
    const html = renderSiteHtml(LANGS[0], siteUrl, sampleHtml);
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);

    expect(jsonLdMatch).not.toBeNull();
    const data = JSON.parse(jsonLdMatch?.[1] ?? '');
    expect(data['@context']).toBe('https://schema.org');
    expect(Array.isArray(data['@graph'])).toBe(true);

    const softwareApp = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'SoftwareApplication');
    const sourceCode = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'SoftwareSourceCode');
    const organization = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'Organization');

    expect(softwareApp).toBeDefined();
    expect(softwareApp).not.toHaveProperty('codeRepository');
    expect(softwareApp).not.toHaveProperty('programmingLanguage');
    expect(softwareApp).not.toHaveProperty('aggregateRating');
    expect(softwareApp).not.toHaveProperty('review');
    expect(softwareApp.offers).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });

    expect(sourceCode).toBeDefined();
    expect(sourceCode.codeRepository).toBe('https://github.com/meathill/hsm');
    expect(sourceCode.programmingLanguage).toEqual({
      '@type': 'ComputerLanguage',
      name: 'TypeScript',
    });
    expect(sourceCode.url).toBe('https://github.com/meathill/hsm');
    expect(organization).toMatchObject({
      '@id': 'https://meathill.com/#organization',
      name: 'Meathill Studio',
      legalName: 'Meathill LLC',
    });
    expect(softwareApp.publisher).toEqual({ '@id': 'https://meathill.com/#organization' });
  });
});
