import type { BinaryOperator } from '../operators.js'

export type {
  ArithmeticOperator,
  BinaryOperator,
  EqualityOperator,
  OrderingOperator,
} from '../operators.js'

export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export type NumericValue = number | bigint

export type LiteralValue = string | NumericValue | boolean | null

interface LiteralAst {
  readonly kind: 'literal'
  readonly value: LiteralValue
  readonly span: SourceSpan
}

interface BinaryAst {
  readonly kind: 'binary'
  readonly operator: BinaryOperator
  readonly left: ExpressionAst
  readonly right: ExpressionAst
  readonly span: SourceSpan
}

interface ConditionalAst {
  readonly kind: 'conditional'
  readonly condition: ExpressionAst
  readonly whenTrue: ExpressionAst
  readonly whenFalse: ExpressionAst
  readonly span: SourceSpan
}

export interface CallAst {
  readonly kind: 'call'
  readonly name: string
  readonly args: readonly ExpressionAst[]
  readonly span: SourceSpan
}

export type ExpressionAst = LiteralAst | BinaryAst | ConditionalAst | CallAst

export type TemplatePart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'expression'; readonly expression: ExpressionAst }

export type TemplateAst = readonly TemplatePart[]
