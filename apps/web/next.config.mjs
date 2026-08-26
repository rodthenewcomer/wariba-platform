/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Self-contained server output for containers.
   *
   * `standalone` traces the exact files the server needs and emits them with a
   * minimal `node_modules`, which is what makes a pnpm *workspace* app
   * deployable as an image at all — without it the runtime stage has to carry
   * the whole monorepo and its symlinked packages. It changes nothing for a
   * platform that builds Next itself; it only adds `.next/standalone`.
   */
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  transpilePackages: [
    '@wariba/design-tokens',
    '@wariba/ui',
    '@wariba/contracts',
    '@wariba/domain',
    '@wariba/policies',
    '@wariba/database',
    '@wariba/validation',
    '@wariba/observability',
    '@wariba/adapters',
    '@wariba/config',
    '@wariba/test-utils',
  ],
};

export default nextConfig;
