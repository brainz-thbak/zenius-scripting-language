import type { SourceSpan } from '../ast/index.js'

export interface ZslIssue {
  readonly kind: 'syntax' | 'validation'
  readonly message: string
  readonly span: SourceSpan
}
