declare module '../../scripts/build.mjs' {
  export function resolveSiteUrl(domain: string | undefined): string;
  export const DEFAULT_SITE_URL: string;
}
