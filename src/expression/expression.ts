import type { ExpressionAst, TemplateAst, TemplatePart } from '../ast/index.js'
import { evaluateExpression } from '../evaluator/index.js'
import { ZslUnsupportedExpressionNodeError } from '../exception/index.js'
import type { ExpressionContract, ZslContext } from './types.js'

export class Expression implements ExpressionContract {
  readonly #ast: TemplateAst

  constructor(ast: TemplateAst) {
    this.#ast = ast
  }

  getAstSnapshot(): TemplateAst {
    return copyTemplateAst(this.#ast)
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

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] }

function copyTemplateAst(ast: TemplateAst): TemplateAst {
  const pending: Mutable<ExpressionAst>[] = []
  const copies = new WeakMap<ExpressionAst, ExpressionAst>()

  const copyNode = (node: ExpressionAst): ExpressionAst => {
    const existing = copies.get(node)
    if (existing !== undefined) {
      return existing
    }
    const copy = { ...node, span: { ...node.span } }
    copies.set(node, copy)
    pending.push(copy)
    return copy
  }

  const snapshot = ast.map(
    (part): TemplatePart =>
      part.kind === 'text'
        ? { ...part }
        : { kind: 'expression', expression: copyNode(part.expression) },
  )
  for (let node = pending.pop(); node; node = pending.pop()) {
    switch (node.kind) {
      case 'literal':
        break
      case 'binary':
        node.left = copyNode(node.left)
        node.right = copyNode(node.right)
        break
      case 'conditional':
        node.condition = copyNode(node.condition)
        node.whenTrue = copyNode(node.whenTrue)
        node.whenFalse = copyNode(node.whenFalse)
        break
      case 'call':
        node.args = node.args.map(copyNode)
        break
      default: {
        const _unhandled: never = node
        throw new ZslUnsupportedExpressionNodeError()
      }
    }
  }
  return snapshot
}
