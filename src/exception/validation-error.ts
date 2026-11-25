import type { ZslIssue } from './types.js'

export class ZslValidationError extends Error {
  override readonly name = 'ZslValidationError'

  constructor(readonly issues: readonly ZslIssue[]) {
    super('ZSL validation failed')
  }
}
