/**
 * Raised after a row lock when the case version no longer matches the page an
 * operator opened. This is an expected operational conflict, not a database
 * failure: the operator must reload and review the newer facts.
 */
export class OperatorCaseStaleError extends Error {
  constructor() {
    super('Ce dossier a changé depuis son ouverture. Rechargez la page avant d’agir.');
    this.name = 'OperatorCaseStaleError';
  }
}

export function assertExpectedCaseVersion(current: number, expected: number): void {
  if (!Number.isInteger(expected) || expected < 1 || current !== expected) {
    throw new OperatorCaseStaleError();
  }
}
