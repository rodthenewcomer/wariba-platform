/** @type {import('next').NextConfig} */
const nextConfig = {
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
