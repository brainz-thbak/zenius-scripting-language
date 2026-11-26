import type { SourceSpan } from '../ast/index.js'
import type { ZslIssue } from './types.js'

export class ZslValidationError extends Error {
  override readonly name = 'ZslValidationError'

  constructor(readonly issues: readonly ZslIssue[]) {
    super('ZSL validation failed')
  }
}

export function syntaxError(
  message: string,
  span: SourceSpan,
): ZslValidationError {
  return new ZslValidationError([{ kind: 'syntax', message, span }])
}

export function validationError(
  message: string,
  span: SourceSpan,
): ZslValidationError {
  return new ZslValidationError([{ kind: 'validation', message, span }])
}
