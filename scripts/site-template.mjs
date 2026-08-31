import { brandCatalog, getBrandNetworkLinks, getOrganizationJsonLd, getPublicBrandSites } from 'meathill-brand';

export const GOOGLE_ANALYTICS_ID = 'G-1S0T1HF97B';
export const COMMENT_SITE_ID = '8a576462-a61c-492a-ad36-33fc48e281b3';
export const COMMENT_API_URL = 'https://awesomecomment.org';
export const COMMENT_GOOGLE_CLIENT_ID = '553490336811-e0lmqt2vkb0nqfc4fbm83lc6mjo4ahbf.apps.googleusercontent.com';
export const COMMENT_STYLE_URL = 'https://unpkg.com/@roudanio/awesome-comment@0.10.7/dist/style.css';
export const COMMENT_AUTH_MODULE_URL = 'https://unpkg.com/@roudanio/awesome-auth@0.1.5/dist/awesome-auth.js';
export const COMMENT_MODULE_URL = 'https://unpkg.com/@roudanio/awesome-comment@0.10.7/dist/awesome-comment.js';
export const COMMENT_THREAD_ID = 'hsm-home';

export const LANGS = [
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
    aiLabel: 'AI 文档',
    siteLabel: 'meathill.com',
    networkLabel: '产品网络',
    allProductsLabel: '全部产品',
    footerText: 'Built with Cloudflare Workers.',
    commentLabel: '评论',
    commentLoadingText: '评论加载中...',
    commentErrorText: '评论加载失败，请稍后重试。',
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
    aiLabel: 'AI Docs',
    siteLabel: 'meathill.com',
    networkLabel: 'Product network',
    allProductsLabel: 'All products',
    footerText: 'Built with Cloudflare Workers.',
    commentLabel: 'Comments',
    commentLoadingText: 'Loading comments...',
    commentErrorText: 'Failed to load comments. Please try again later.',
  },
];

export const AI_ASSETS = ['llms.txt', 'SKILL.md', 'mcp.json'];

export const SITE_LINK_REWRITES = [
  ['./README.md', '/'],
  ['README.md', '/'],
  ['./README_EN.md', '/en/'],
  ['README_EN.md', '/en/'],
  ['./llms.txt', '/llms.txt'],
  ['llms.txt', '/llms.txt'],
  ['./SKILL.md', '/SKILL.md'],
  ['SKILL.md', '/SKILL.md'],
  ['./mcp.json', '/mcp.json'],
  ['mcp.json', '/mcp.json'],
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCanonicalUrl(lang, siteUrl) {
  return lang === 'zh-CN' ? `${siteUrl}/` : `${siteUrl}/en/`;
}

function getStructuredData(description, siteUrl) {
  const author = {
    '@type': 'Person',
    name: 'Meathill',
    url: 'https://meathill.com',
  };

  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': [
        getOrganizationJsonLd(),
        {
          '@type': 'SoftwareApplication',
          name: 'Meathill HSM',
          description,
          url: `${siteUrl}/`,
          applicationCategory: 'SecurityApplication',
          operatingSystem: 'Cloudflare Workers',
          inLanguage: ['zh-CN', 'en'],
          author,
          publisher: { '@id': brandCatalog.organization.id },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
        {
          '@type': 'SoftwareSourceCode',
          name: 'Meathill HSM',
          codeRepository: 'https://github.com/meathill/hsm',
          programmingLanguage: {
            '@type': 'ComputerLanguage',
            name: 'TypeScript',
          },
          url: 'https://github.com/meathill/hsm',
          author,
        },
      ],
    },
    null,
    2,
  );
}

function getSiteSwitcher(config) {
  const links = getPublicBrandSites()
    .map(
      (site) =>
        `<a${site.id === 'hsm' ? ' aria-current="page"' : ''} href="${escapeHtml(site.url)}">${escapeHtml(site.name)}</a>`,
    )
    .join('');

  return `<details class="site-switcher">
    <summary>${escapeHtml(config.networkLabel)}</summary>
    <div class="site-switcher-panel">${links}<a class="all-products" href="${escapeHtml(brandCatalog.directoryUrl)}">${escapeHtml(config.allProductsLabel)}</a></div>
  </details>`;
}

function getFooterLinks(config) {
  const links = getBrandNetworkLinks('hsm')
    .map((site) => `<a href="${escapeHtml(site.url)}">${escapeHtml(site.name)}</a>`)
    .join('');
  return `${links}<a href="${escapeHtml(brandCatalog.directoryUrl)}">${escapeHtml(config.allProductsLabel)}</a>`;
}

function getCommentSection(config) {
  const runtimeConfig = {
    apiUrl: COMMENT_API_URL,
    googleClientId: COMMENT_GOOGLE_CLIENT_ID,
    siteId: COMMENT_SITE_ID,
    postId: COMMENT_THREAD_ID,
    locale: config.lang,
    authRoot: `${COMMENT_API_URL}/api/site/auth`,
    authPrefix: 'acSaas',
    cssUrl: COMMENT_STYLE_URL,
    authModuleUrl: COMMENT_AUTH_MODULE_URL,
    commentModuleUrl: COMMENT_MODULE_URL,
    loadingText: config.commentLoadingText,
    errorText: config.commentErrorText,
  };

  return `
    <section class="comment-section" aria-labelledby="comments-title">
      <h2 id="comments-title">${escapeHtml(config.commentLabel)}</h2>
      <div id="awesome-comment" class="comment-placeholder" data-thread-id="${COMMENT_THREAD_ID}">${escapeHtml(config.commentLoadingText)}</div>
    </section>
    <script type="module">
      const config = ${JSON.stringify(runtimeConfig)};
      const container = document.getElementById('awesome-comment');

      if (container) {
        let hasInitialized = false;

        async function loadAndInitComments() {
          if (hasInitialized) return;
          hasInitialized = true;

          try {
            const existingStyle = document.querySelector('link[href="' + config.cssUrl + '"]');
            if (!existingStyle) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = config.cssUrl;
              document.head.appendChild(link);
            }

            const [authModule, commentModule] = await Promise.all([
              import(config.authModuleUrl),
              import(config.commentModuleUrl),
            ]);

            const awesomeAuth = authModule.getInstance({
              googleId: config.googleClientId,
              root: config.authRoot,
              prefix: config.authPrefix,
            });

            container.textContent = '';
            commentModule.default.init(container, {
              apiUrl: config.apiUrl,
              awesomeAuth,
              locale: config.locale,
              postId: config.postId,
              siteId: config.siteId,
            });
          } catch (error) {
            console.error('Failed to load Awesome Comment:', error);
            container.replaceChildren();

            const message = document.createElement('p');
            message.className = 'comment-error';
            message.textContent = config.errorText;
            container.appendChild(message);
          }
        }

        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            if (entries[0] && entries[0].isIntersecting) {
              observer.disconnect();
              void loadAndInitComments();
            }
          });

          observer.observe(container);
        } else {
          void loadAndInitComments();
        }
      }
    </script>`;
}

export function rewriteHtmlLinksForSite(htmlContent) {
  let output = htmlContent;
  for (const [sourceHref, targetHref] of SITE_LINK_REWRITES) {
    output = output.replaceAll(`href="${sourceHref}"`, `href="${targetHref}"`);
  }
  return output;
}

export function renderSiteHtml(config, siteUrl, htmlContent) {
  const canonicalUrl = getCanonicalUrl(config.lang, siteUrl);
  const structuredData = getStructuredData(config.description, siteUrl);
  const commentSection = getCommentSection(config);

  return `<!DOCTYPE html>
<html lang="${config.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(config.description)}">
  <meta name="keywords" content="${escapeHtml(config.keywords)}">
  <meta name="author" content="Meathill">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="zh-CN" href="${siteUrl}/">
  <link rel="alternate" hreflang="en" href="${siteUrl}/en/">
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/">
  <link rel="stylesheet" href="/brand.css">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(config.title)}">
  <meta property="og:description" content="${escapeHtml(config.description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="${config.lang === 'zh-CN' ? 'zh_CN' : 'en_US'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(config.title)}">
  <meta name="twitter:description" content="${escapeHtml(config.description)}">

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GOOGLE_ANALYTICS_ID}');
  </script>

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
${structuredData}
  </script>

</head>
<body>
  <header class="site-header">
    <div class="site-header-inner">
      <div class="brand-lockup">
        <a class="studio-name" href="${brandCatalog.organization.url}">Meathill Studio</a>
        <span aria-hidden="true" class="brand-divider"></span>
        <a class="product-name" href="${siteUrl}/">Meathill HSM</a>
      </div>
      <nav class="site-nav" aria-label="${escapeHtml(config.networkLabel)}">
        ${getSiteSwitcher(config)}
        <a class="primary-nav" href="${config.switchHref}">${escapeHtml(config.switchLabel)}</a>
        <a href="/llms.txt">${escapeHtml(config.aiLabel)}</a>
        <a href="https://github.com/meathill/hsm" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </div>
  </header>

  <main class="site-main">
    <article class="content-card">
      ${htmlContent}
    </article>
${commentSection}
  </main>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <div>
        <strong>Meathill Studio</strong>
        <p>&copy; ${new Date().getFullYear()} ${brandCatalog.organization.legalName}. ${escapeHtml(config.footerText)}</p>
      </div>
      <nav class="footer-links" aria-label="${escapeHtml(config.networkLabel)}">${getFooterLinks(config)}</nav>
    </div>
  </footer>
</body>
</html>`;
}
