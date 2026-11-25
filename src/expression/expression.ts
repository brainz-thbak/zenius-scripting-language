import type { TemplateAst } from '../ast/index.js'
import type { ExpressionContract, ZslContext } from './types.js'

export class Expression implements ExpressionContract {
  readonly #ast: TemplateAst

  constructor(ast: TemplateAst) {
    this.#ast = ast
  }

  evaluate(_context?: ZslContext): string {
    throw new Error('Expression.evaluate() is not implemented')
  }
}
