import type { TemplateAst } from '../ast/index.js'
import { evaluateExpression } from '../evaluator/index.js'
import type { ExpressionContract, ZslContext } from './types.js'

export class Expression implements ExpressionContract {
  readonly #ast: TemplateAst

  constructor(ast: TemplateAst) {
    this.#ast = ast
  }

  evaluate(context?: ZslContext): string {
    let result = ''
    for (const part of this.#ast) {
      result +=
        part.kind === 'text'
          ? part.value
          : String(evaluateExpression(part.expression, context))
    }
    return result
  }
}
