import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

async function build() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const readmePath = path.join(rootDir, 'README.md');
  const outPath = path.join(publicDir, 'index.html');

  try {
    // Ensure public directory exists
    await fs.mkdir(publicDir, { recursive: true });

    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    // Replace domain placeholder with environment variable if present
    const domain = process.env.DOMAIN;
    let processedContent = readmeContent;
    if (domain) {
      // Assuming protocol is https:// if domain is provided
      const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
      processedContent = processedContent.replace(/https:\/\/<your-hsm-worker-url>/g, fullDomain);
    }

    const htmlContent = await marked.parse(processedContent);

    const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meathill HSM Documentation</title>

  <!-- 加载 TailwindCSS 及其 Typography 插件 -->
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body class="bg-gray-50 text-slate-900 font-sans antialiased">
  <!-- 顶部导航条 -->
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-indigo-600">Meathill HSM</h1>
      <a href="https://github.com/meathill/hsm" target="_blank" class="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        GitHub Source
      </a>
    </div>
  </header>

  <!-- 内容区 -->
  <main class="max-w-4xl mx-auto px-6 py-12">
    <article class="prose prose-slate prose-indigo lg:prose-lg max-w-none bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
      ${htmlContent}
    </article>
  </main>
</body>
</html>`;

    await fs.writeFile(outPath, template);
    console.log('Successfully generated index.html');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
