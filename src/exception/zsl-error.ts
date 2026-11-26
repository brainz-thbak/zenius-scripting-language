import type { ZslIssue } from './types.js'

export abstract class ZslError<
  Issue extends ZslIssue = ZslIssue,
> extends Error {
  abstract readonly code: string

  constructor(
    message: string,
    readonly issues: readonly Issue[],
  ) {
    super(message)
  }
}
