import type {
  ArithmeticOperator,
  LiteralValue,
  ParsedExpressionAst,
  SourceSpan,
} from '../ast/index.js'
import { ZslValidationError } from '../exception/index.js'

const arithmeticOperations: Readonly<
  Record<ArithmeticOperator, (left: number, right: number) => number>
> = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  '*': (left, right) => left * right,
  '/': (left, right) => left / right,
}

type BinaryExpressionAst = Extract<ParsedExpressionAst, { kind: 'binary' }>

type PendingOperation =
  | { readonly kind: 'left'; readonly node: BinaryExpressionAst }
  | {
      readonly kind: 'right'
      readonly node: BinaryExpressionAst
      readonly left: number
    }

export function evaluateExpression(ast: ParsedExpressionAst): LiteralValue {
  const pending: PendingOperation[] = []
  let node = ast

  while (true) {
    while (node.kind === 'binary') {
      pending.push({ kind: 'left', node })
      node = node.left
    }
    let value: LiteralValue = node.value

    while (true) {
      const frame = pending.pop()
      if (frame === undefined) {
        return value
      }
      const { node: binary } = frame
      if (frame.kind === 'left') {
        const left = requireNumber(value, binary.left.span)
        pending.push({ kind: 'right', node: binary, left })
        node = binary.right
        break
      }
      const right = requireNumber(value, binary.right.span)
      if (binary.operator === '/' && right === 0) {
        throw validationError('Division by zero', binary.right.span)
      }
      const result = arithmeticOperations[binary.operator](frame.left, right)
      if (!Number.isFinite(result)) {
        throw validationError('Arithmetic result must be finite', binary.span)
      }
      value = result
    }
  }
}

function requireNumber(value: LiteralValue, span: SourceSpan): number {
  if (typeof value !== 'number') {
    throw validationError('Arithmetic operands must be numbers', span)
  }
  return value
}

function validationError(
  message: string,
  span: SourceSpan,
): ZslValidationError {
  return new ZslValidationError([{ kind: 'validation', message, span }])
}
