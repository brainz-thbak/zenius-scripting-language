import type { ZslIssue } from './types.js'

export abstract class ZslError<
  Issue extends ZslIssue = ZslIssue,
> extends Error {
  abstract readonly code: string
  readonly issues: readonly Issue[]

  constructor(message: string, issues: readonly Issue[]) {
    super(message)
    this.issues = issues.map((issue) => {
      if (Object.getPrototypeOf(issue) !== Object.prototype) {
        return issue
      }
      const { kind, message, span } = issue
      return {
        ...issue,
        kind,
        message,
        span:
          Object.getPrototypeOf(span) === Object.prototype
            ? { ...span, start: span.start, end: span.end }
            : span,
      }
    })
  }
}
