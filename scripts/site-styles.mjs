export const SITE_STYLES = `
* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--meathill-cream);
  color: var(--meathill-ink);
  font-family: var(--meathill-font-sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--meathill-yellow-deep); text-underline-offset: 3px; }
a:hover { color: var(--meathill-ink); }
a:focus-visible, summary:focus-visible { outline: none; box-shadow: var(--meathill-focus-ring); }

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--meathill-rule);
  background: color-mix(in srgb, var(--meathill-cream) 90%, transparent);
  backdrop-filter: blur(8px);
}

.site-header-inner, .site-main, .site-footer-inner {
  width: min(100% - 32px, 960px);
  margin-inline: auto;
}

.site-header-inner {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-lockup, .site-nav { display: flex; align-items: center; gap: 12px; }
.brand-lockup a { color: inherit; text-decoration: none; }
.studio-name { font-family: var(--meathill-font-display); font-weight: 800; }
.product-name { font-weight: 800; }
.brand-divider { width: 1px; height: 20px; background: var(--meathill-rule-strong); }

.site-nav { flex-wrap: wrap; justify-content: flex-end; font-size: 14px; }
.site-nav > a { color: var(--meathill-ink-soft); text-decoration: none; }

.site-switcher { position: relative; }
.site-switcher summary {
  border-radius: var(--meathill-radius);
  padding: 6px 8px;
  color: var(--meathill-ink-soft);
  cursor: pointer;
  list-style: none;
}
.site-switcher summary::-webkit-details-marker { display: none; }
.site-switcher summary:hover, .site-switcher[open] summary { background: var(--meathill-fluff); color: var(--meathill-ink); }
.site-switcher-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: grid;
  width: min(320px, calc(100vw - 32px));
  max-height: min(480px, 70vh);
  gap: 4px;
  overflow-y: auto;
  border: 1px solid var(--meathill-rule-strong);
  border-radius: var(--meathill-radius-large);
  padding: 8px;
  background: var(--meathill-paper);
  box-shadow: 0 10px 20px -5px rgb(58 46 35 / 0.16);
}
.site-switcher-panel a { border-radius: var(--meathill-radius); padding: 7px 10px; color: var(--meathill-ink-soft); text-decoration: none; }
.site-switcher-panel a:hover { background: var(--meathill-fluff); color: var(--meathill-ink); }
.site-switcher-panel .all-products { margin-top: 4px; border-top: 1px solid var(--meathill-rule); border-radius: 0; color: var(--meathill-yellow-deep); font-weight: 700; }

.site-main { padding-block: 32px; }
.content-card, .comment-section {
  border: 1px solid var(--meathill-rule-strong);
  border-radius: var(--meathill-radius-large);
  padding: clamp(20px, 4vw, 40px);
  background: var(--meathill-paper);
  box-shadow: 0 2px 6px rgb(58 46 35 / 0.06);
}
.comment-section { margin-top: 24px; }
.comment-section h2 { margin-top: 0; }
.comment-placeholder { min-height: 200px; color: var(--meathill-mute); font-size: 14px; }

.content-card h1, .content-card h2, .content-card h3 {
  color: var(--meathill-ink);
  line-height: 1.25;
}
.content-card h1 { margin-top: 0; font-family: var(--meathill-font-display); font-size: clamp(30px, 5vw, 48px); }
.content-card h2 { margin-top: 32px; font-size: 24px; }
.content-card h3 { margin-top: 24px; font-size: 20px; }
.content-card p, .content-card li { color: var(--meathill-ink-soft); }
.content-card pre {
  overflow-x: auto;
  border: 1px solid var(--meathill-rule);
  border-radius: var(--meathill-radius);
  padding: 16px;
  background: var(--meathill-cream);
  color: var(--meathill-ink);
  font-family: var(--meathill-font-mono);
  font-size: 14px;
}
.content-card code { font-family: var(--meathill-font-mono); }
.content-card :not(pre) > code { border-radius: 4px; padding: 2px 6px; background: var(--meathill-fluff); color: var(--meathill-yellow-deep); }
.content-card table { width: 100%; border-collapse: collapse; font-size: 14px; }
.content-card th, .content-card td { border-bottom: 1px solid var(--meathill-rule); padding: 8px; text-align: left; }
.content-card blockquote { margin-inline: 0; border: 1px solid var(--meathill-rule); border-radius: var(--meathill-radius); padding: 12px 16px; background: var(--meathill-fluff); }

.site-footer { border-top: 1px solid var(--meathill-rule); background: var(--meathill-paper); }
.site-footer-inner { display: grid; grid-template-columns: 1fr minmax(220px, .7fr); gap: 24px; padding-block: 32px; }
.site-footer p { margin: 0; color: var(--meathill-mute); font-size: 12px; }
.footer-links { display: flex; flex-wrap: wrap; align-content: start; gap: 8px 16px; }
.footer-links a { color: var(--meathill-ink-soft); font-size: 14px; text-decoration: none; }
.footer-links a:hover { color: var(--meathill-yellow-deep); }

@media (max-width: 720px) {
  .site-header-inner { align-items: flex-start; padding-block: 10px; }
  .site-nav > a:not(.primary-nav) { display: none; }
  .brand-lockup { gap: 8px; }
  .studio-name { font-size: 14px; }
  .site-footer-inner { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
`;
