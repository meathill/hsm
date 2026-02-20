import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const LANGS = [
  {
    lang: 'zh-CN',
    readmeFile: 'README.md',
    outFile: 'index.html',
    title: 'Meathill HSM - 零信任密钥管理系统',
    description:
      '基于 Cloudflare Worker 的零信任密钥管理服务。采用信封加密 + 密钥分片设计，支持前端直连，数据安全无忧。',
    keywords: 'HSM, 密钥管理, Cloudflare Worker, 零信任, 信封加密, AES-GCM, CORS, API',
    switchLabel: 'English',
    switchHref: '/en/',
    footerText: 'Built with Cloudflare Workers.',
  },
  {
    lang: 'en',
    readmeFile: 'README_EN.md',
    outFile: 'en/index.html',
    title: 'Meathill HSM - Zero-Trust Key Management',
    description:
      'A zero-trust key management service built on Cloudflare Workers. Features envelope encryption, key splitting, and direct frontend access.',
    keywords: 'HSM, Key Management, Cloudflare Worker, Zero-Trust, Envelope Encryption, AES-GCM, CORS, API',
    switchLabel: '中文',
    switchHref: '/',
    footerText: 'Built with Cloudflare Workers.',
  },
];

function getTemplate(cfg, siteUrl, htmlContent) {
  const canonicalUrl = cfg.lang === 'zh-CN' ? `${siteUrl}/` : `${siteUrl}/en/`;

  return `<!DOCTYPE html>
<html lang="${cfg.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.title}</title>
  <meta name="description" content="${cfg.description}">
  <meta name="keywords" content="${cfg.keywords}">
  <meta name="author" content="Meathill">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="zh-CN" href="${siteUrl}/">
  <link rel="alternate" hreflang="en" href="${siteUrl}/en/">
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${cfg.title}">
  <meta property="og:description" content="${cfg.description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="${cfg.lang === 'zh-CN' ? 'zh_CN' : 'en_US'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${cfg.title}">
  <meta name="twitter:description" content="${cfg.description}">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Meathill HSM",
    "description": "${cfg.description}",
    "url": "${siteUrl}/",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Cloudflare Workers",
    "inLanguage": ["zh-CN", "en"],
    "author": {
      "@type": "Person",
      "name": "Meathill",
      "url": "https://github.com/meathill"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "codeRepository": "https://github.com/meathill/hsm",
    "programmingLanguage": "TypeScript"
  }
  </script>

  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body class="bg-gray-50 text-slate-900 font-sans antialiased">
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-indigo-600">Meathill HSM</h1>
      <nav class="flex items-center gap-4 text-sm font-medium text-gray-500">
        <a href="${cfg.switchHref}" class="hover:text-gray-900 transition-colors">${cfg.switchLabel}</a>
        <a href="https://github.com/meathill/hsm" target="_blank" rel="noopener noreferrer" class="hover:text-gray-900 transition-colors">GitHub</a>
      </nav>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">
    <article class="prose prose-slate prose-indigo lg:prose-lg max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
      ${htmlContent}
    </article>
  </main>

  <footer class="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
    <p>&copy; ${new Date().getFullYear()} Meathill HSM. ${cfg.footerText}</p>
  </footer>
</body>
</html>`;
}

async function build() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const domain = process.env.DOMAIN;
  const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : 'https://hsm.example.com';

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

      const htmlContent = await marked.parse(content);
      const html = getTemplate(cfg, siteUrl, htmlContent);

      await fs.writeFile(path.join(publicDir, cfg.outFile), html);
      console.log(`✅ Generated public/${cfg.outFile}`);
    }

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

build();
