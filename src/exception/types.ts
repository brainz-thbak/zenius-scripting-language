import type { SourceSpan } from '../ast/index.js'

export interface ZslIssue<
  Kind extends 'syntax' | 'validation' = 'syntax' | 'validation',
> {
  readonly kind: Kind
  readonly message: string
  readonly span: SourceSpan
}
