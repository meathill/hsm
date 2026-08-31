import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';
import { SITE_STYLES } from './site-styles.mjs';
import { AI_ASSETS, LANGS, renderSiteHtml, rewriteHtmlLinksForSite } from './site-template.mjs';

export const DEFAULT_SITE_URL = 'https://hsm.meathill.com';

export function resolveSiteUrl(domain) {
  return domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : DEFAULT_SITE_URL;
}

async function publishAiAssets(rootDir, publicDir) {
  for (const file of AI_ASSETS) {
    await fs.copyFile(path.join(rootDir, file), path.join(publicDir, file));
    console.log(`✅ Published public/${file}`);
  }

  const wellKnownDir = path.join(publicDir, '.well-known');
  await fs.mkdir(wellKnownDir, { recursive: true });
  await fs.copyFile(path.join(rootDir, 'mcp.json'), path.join(wellKnownDir, 'mcp.json'));
  console.log('✅ Published public/.well-known/mcp.json');
}

async function publishBrandStyles(publicDir) {
  const tokensPath = fileURLToPath(import.meta.resolve('meathill-brand/tokens.css'));
  const tokens = await fs.readFile(tokensPath, 'utf8');
  await fs.writeFile(path.join(publicDir, 'brand.css'), `${tokens}\n${SITE_STYLES}`, 'utf8');
  console.log('✅ Published public/brand.css');
}

function getTemplate(cfg, siteUrl, htmlContent) {
  return renderSiteHtml(cfg, siteUrl, htmlContent);
}

async function build() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const domain = process.env.DOMAIN;
  const siteUrl = resolveSiteUrl(domain);

  try {
    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(path.join(publicDir, 'en'), { recursive: true });

    // 生成各语言版本的 HTML
    for (const cfg of LANGS) {
      let content = await fs.readFile(path.join(rootDir, cfg.readmeFile), 'utf-8');

      // 替换域名占位符
      if (domain) {
        content = content.replace(/https:\/\/<your-hsm-worker-url>/g, siteUrl);
      }

      const rawHtmlContent = await marked.parse(content);
      const htmlContent = rewriteHtmlLinksForSite(rawHtmlContent);
      const html = getTemplate(cfg, siteUrl, htmlContent);

      await fs.writeFile(path.join(publicDir, cfg.outFile), html);
      console.log(`✅ Generated public/${cfg.outFile}`);
    }

    await publishAiAssets(rootDir, publicDir);
    await publishBrandStyles(publicDir);

    // ========== 生成 sitemap.xml ==========
    const now = new Date().toISOString().split('T')[0];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${siteUrl}/</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${siteUrl}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/"/>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/en/</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${siteUrl}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/"/>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/llms.txt</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/SKILL.md</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/mcp.json</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/.well-known/mcp.json</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

    await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('✅ Generated public/sitemap.xml');

    // ========== 生成 robots.txt ==========
    const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

    await fs.writeFile(path.join(publicDir, 'robots.txt'), robots);
    console.log('✅ Generated public/robots.txt');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build();
}
