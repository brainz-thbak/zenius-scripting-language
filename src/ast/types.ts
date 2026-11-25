export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export type LiteralValue = string | number | boolean | null

export type BinaryOperator = '+' | '-' | '*' | '/' | '&&' | '||' | '??'

export type ExpressionAst = { readonly span: SourceSpan } & (
  | { readonly kind: 'literal'; readonly value: LiteralValue }
  | {
      readonly kind: 'binary'
      readonly operator: BinaryOperator
      readonly left: ExpressionAst
      readonly right: ExpressionAst
    }
  | {
      readonly kind: 'conditional'
      readonly condition: ExpressionAst
      readonly whenTrue: ExpressionAst
      readonly whenFalse: ExpressionAst
    }
  | {
      readonly kind: 'call'
      readonly name: string
      readonly args: readonly ExpressionAst[]
    }
)

export type LiteralAst = Extract<ExpressionAst, { kind: 'literal' }>

export type TemplatePart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'expression'; readonly expression: ExpressionAst }

export type TemplateAst = readonly TemplatePart[]
