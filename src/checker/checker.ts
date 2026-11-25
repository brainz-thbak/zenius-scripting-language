import type { ExpressionAst } from '../ast/index.js'
import { resolveCall } from '../functions/functions.js'

export function checkExpression(ast: ExpressionAst): void {
  const pending = [ast]
  for (let node = pending.pop(); node; node = pending.pop()) {
    switch (node.kind) {
      case 'literal':
        break
      case 'binary':
        pending.push(node.right, node.left)
        break
      case 'conditional':
        pending.push(node.whenFalse, node.whenTrue, node.condition)
        break
      case 'call':
        resolveCall(node)
        for (let index = node.args.length - 1; index >= 0; index--) {
          pending.push(node.args[index])
        }
        break
    }
  }
}
