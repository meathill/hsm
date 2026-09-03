import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, resolveSiteUrl } from '../scripts/build.mjs';
import { COMMENT_THREAD_ID, GOOGLE_ANALYTICS_ID, LANGS, renderSiteHtml } from '../scripts/site-template.mjs';

describe('site template', () => {
  const siteUrl = DEFAULT_SITE_URL;
  const sampleHtml = '<h1>Sample</h1><p>Body</p>';

  it('默认使用正式域名，并允许部署环境显式覆盖', () => {
    expect(resolveSiteUrl(undefined)).toBe('https://hsm.meathill.com');
    expect(resolveSiteUrl('preview.example.com')).toBe('https://preview.example.com');
    expect(resolveSiteUrl('http://localhost:8787')).toBe('http://localhost:8787');
  });

  it('为中文页面注入品牌网络、GA 与评论区', () => {
    const html = renderSiteHtml(LANGS[0], siteUrl, sampleHtml);

    expect(html).toContain(`googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`);
    expect(html).toContain(`gtag('config', '${GOOGLE_ANALYTICS_ID}')`);
    expect(html).toContain('href="https://meathill.com"');
    expect(html).toContain('>Meathill Studio<');
    expect(html).toContain('href="/brand.css"');
    expect(html).toContain('>产品网络<');
    expect(html).toContain('href="https://meathill.com/app"');
    expect(html).toContain('href="https://hsm.meathill.com/"');
    expect(html).toContain('<link rel="canonical" href="https://hsm.meathill.com/">');
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

  it('输出合法的 JSON-LD：无 SoftwareApplication（避免无真实评分的富结果报错），用 WebPage + SoftwareSourceCode 描述页面', () => {
    for (const [index, config] of LANGS.entries()) {
      const html = renderSiteHtml(config, siteUrl, sampleHtml);
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);

      expect(jsonLdMatch).not.toBeNull();
      const data = JSON.parse(jsonLdMatch?.[1] ?? '');
      expect(data['@context']).toBe('https://schema.org');
      expect(Array.isArray(data['@graph'])).toBe(true);

      const types = data['@graph'].map((item: { '@type'?: string }) => item['@type']);
      expect(types).not.toContain('SoftwareApplication');
      expect(types).not.toContain('WebApplication');

      const webPage = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'WebPage');
      const sourceCode = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'SoftwareSourceCode');
      const organization = data['@graph'].find((item: { '@type'?: string }) => item['@type'] === 'Organization');

      const expectedCanonical = index === 0 ? `${siteUrl}/` : `${siteUrl}/en/`;
      expect(webPage).toBeDefined();
      expect(webPage.url).toBe(expectedCanonical);
      expect(webPage['@id']).toBe(`${expectedCanonical}#webpage`);
      expect(webPage.name).toBe(config.title);
      expect(webPage.description).toBe(config.description);
      expect(webPage.inLanguage).toBe(config.lang);
      expect(webPage.publisher).toEqual({ '@id': 'https://meathill.com/#organization' });
      expect(webPage).not.toHaveProperty('aggregateRating');
      expect(webPage).not.toHaveProperty('review');
      expect(webPage).not.toHaveProperty('offers');

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
    }
  });
});
