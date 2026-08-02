/** @type {import('next').NextConfig} */
const nextConfig = {
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
