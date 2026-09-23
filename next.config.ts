import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false, devIndicators: false,
  outputFileTracingExcludes: { '/*': ['./Marina e Thiago/**/*', './reports/**/*', './.data/**/*', './.npm-cache/**/*'] },
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ] },
      { source: '/media/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};
export default config;


