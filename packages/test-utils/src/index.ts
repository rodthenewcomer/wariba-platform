/**
 * @wariba/test-utils — Deterministic clocks, ID generators, fixture builders and scenario packs for tests.
 *
 * Scaffolded in Prompt 01 (Repository Foundation) per WARIBA Prompt Pack v1.0.
 * Prompt 01's scope is limited to creating the package structure — real
 * implementation is out of scope here and lands in introduced alongside the first tests that need deterministic fixtures (Prompt 03+).
 * See WARIBA_Prompt_Pack_v1.0.md and WARIBA_System_Architecture_v1.0.md §10.
 */

export const PACKAGE_NAME = '@wariba/test-utils';

export { seedTradeAccount, type TradeAccountFixture } from './trade-account-fixture';
export {
  E2E_TEST_PASSWORD,
  createFixtureDb,
  createFixtureAccount,
  attachFixtureAccountToUser,
  deleteFixtureAccount,
  type E2eFixtureAccount,
} from './hub-account-fixture';
export {
  STAFF_E2E_TEST_PASSWORD,
  createFixtureDb as createStaffFixtureDb,
  seedStaffUser,
  seedTraderUser,
  deleteStaffFixtureUser,
  type StaffFixtureUser,
} from './staff-fixture';
// Re-exported so E2E specs never import @wariba/database directly (AGENTS.md §7.1).
export { evaluateAndApplyAccountRisk, type Db, type StaffRole } from '@wariba/database';
