export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export type LiteralValue = string | number | boolean | null

export type ArithmeticOperator = '+' | '-' | '*' | '/'

export type BinaryOperator = ArithmeticOperator | '&&' | '||' | '??'

interface LiteralAst {
  readonly kind: 'literal'
  readonly value: LiteralValue
  readonly span: SourceSpan
}

interface BinaryAst<Operand> {
  readonly kind: 'binary'
  readonly operator: BinaryOperator
  readonly left: Operand
  readonly right: Operand
  readonly span: SourceSpan
}

interface ConditionalAst<Operand> {
  readonly kind: 'conditional'
  readonly condition: Operand
  readonly whenTrue: Operand
  readonly whenFalse: Operand
  readonly span: SourceSpan
}

export type ParsedExpressionAst =
  | LiteralAst
  | BinaryAst<ParsedExpressionAst>
  | ConditionalAst<ParsedExpressionAst>

export type ExpressionAst =
  | LiteralAst
  | BinaryAst<ExpressionAst>
  | ConditionalAst<ExpressionAst>
  | {
      readonly kind: 'call'
      readonly name: string
      readonly args: readonly ExpressionAst[]
      readonly span: SourceSpan
    }

export type TemplatePart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'expression'; readonly expression: ExpressionAst }

export type TemplateAst = readonly TemplatePart[]
