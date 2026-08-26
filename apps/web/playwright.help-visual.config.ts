import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Capture-only configuration for Help visual evidence.
 *
 * Both allowed specs seed and remove their own isolated fixture accounts. The
 * suite-wide Hub session created by the normal global setup is therefore
 * unused here, and coupling a visual export to that unrelated login adds a
 * second account and a second Auth round trip without testing anything.
 * Normal E2E commands continue to use `playwright.config.ts` unchanged.
 */
const { globalSetup: _globalSetup, globalTeardown: _globalTeardown, ...captureConfig } = baseConfig;

export default defineConfig({
  ...captureConfig,
  outputDir: 'test-results/help-visual',
});
