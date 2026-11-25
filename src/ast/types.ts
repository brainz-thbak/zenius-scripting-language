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

interface BinaryAst<Operator extends BinaryOperator, Operand> {
  readonly kind: 'binary'
  readonly operator: Operator
  readonly left: Operand
  readonly right: Operand
  readonly span: SourceSpan
}

export type ParsedExpressionAst =
  | LiteralAst
  | BinaryAst<ArithmeticOperator, ParsedExpressionAst>

export type ExpressionAst =
  | LiteralAst
  | BinaryAst<BinaryOperator, ExpressionAst>
  | {
      readonly kind: 'conditional'
      readonly condition: ExpressionAst
      readonly whenTrue: ExpressionAst
      readonly whenFalse: ExpressionAst
      readonly span: SourceSpan
    }
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
