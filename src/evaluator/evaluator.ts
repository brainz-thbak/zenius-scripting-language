import type { LiteralAst, LiteralValue } from '../ast/index.js'

export function evaluateExpression(ast: LiteralAst): LiteralValue {
  return ast.value
}
