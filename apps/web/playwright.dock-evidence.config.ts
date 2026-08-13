import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * The dock evidence spec owns its isolated trade-account fixture and signs that
 * user in itself. The repository-wide global fixture is unrelated to this
 * single-scenario capture, so omitting it keeps a failure in that shared setup
 * from hiding the dock result.
 */
const {
  globalSetup: _globalSetup,
  globalTeardown: _globalTeardown,
  ...configWithoutGlobalFixture
} = baseConfig;

export default defineConfig({
  ...configWithoutGlobalFixture,
});
