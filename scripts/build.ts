import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const SITE_TITLE = 'Meathill HSM - 零信任密钥管理系统';
const SITE_DESCRIPTION =
  '基于 Cloudflare Worker 的零信任密钥管理服务。采用信封加密 + 密钥分片设计，支持前端直连，数据安全无忧。';

async function build() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const readmePath = path.join(rootDir, 'README.md');

  try {
    await fs.mkdir(publicDir, { recursive: true });

    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    // 替换域名占位符
    const domain = process.env.DOMAIN;
    let processedContent = readmeContent;
    if (domain) {
      const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
      processedContent = processedContent.replace(/https:\/\/<your-hsm-worker-url>/g, fullDomain);
    }

    const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : 'https://hsm.example.com';

    const htmlContent = await marked.parse(processedContent);

    // ========== 生成 index.html ==========
    const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_TITLE}</title>
  <meta name="description" content="${SITE_DESCRIPTION}">
  <meta name="keywords" content="HSM, 密钥管理, Cloudflare Worker, 零信任, 信封加密, AES-GCM, CORS, API">
  <meta name="author" content="Meathill">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${siteUrl}/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${SITE_TITLE}">
  <meta property="og:description" content="${SITE_DESCRIPTION}">
  <meta property="og:url" content="${siteUrl}/">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${SITE_TITLE}">
  <meta name="twitter:description" content="${SITE_DESCRIPTION}">

  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body class="bg-gray-50 text-slate-900 font-sans antialiased">
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-indigo-600">Meathill HSM</h1>
      <a href="https://github.com/meathill/hsm" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        GitHub Source
      </a>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">
    <article class="prose prose-slate prose-indigo lg:prose-lg max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
      ${htmlContent}
    </article>
  </main>

  <footer class="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
    <p>&copy; ${new Date().getFullYear()} Meathill HSM. Built with Cloudflare Workers.</p>
  </footer>
</body>
</html>`;

    await fs.writeFile(path.join(publicDir, 'index.html'), template);
    console.log('✅ Generated public/index.html');

    // ========== 生成 sitemap.xml ==========
    const now = new Date().toISOString().split('T')[0];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
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
