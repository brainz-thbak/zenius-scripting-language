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

type PendingOperation =
  | {
      readonly kind: 'condition'
      readonly node: Extract<ParsedExpressionAst, { kind: 'conditional' }>
    }
  | {
      readonly kind: 'left'
      readonly node: Extract<ParsedExpressionAst, { kind: 'binary' }>
    }
  | {
      readonly kind: 'arithmeticRight'
      readonly operator: ArithmeticOperator
      readonly left: number
      readonly rightSpan: SourceSpan
      readonly span: SourceSpan
    }
  | { readonly kind: 'logicalRight'; readonly span: SourceSpan }

export function evaluateExpression(ast: ParsedExpressionAst): LiteralValue {
  const pending: PendingOperation[] = []
  let value = descendToLiteral(ast, pending)

  for (let frame = pending.pop(); frame; frame = pending.pop()) {
    switch (frame.kind) {
      case 'condition': {
        const { condition, whenTrue, whenFalse } = frame.node
        if (typeof value !== 'boolean') {
          throw validationError(
            'Conditional condition must be a boolean',
            condition.span,
          )
        }
        value = descendToLiteral(value ? whenTrue : whenFalse, pending)
        break
      }
      case 'left': {
        const binary = frame.node
        switch (binary.operator) {
          case '??':
            if (value !== null) {
              continue
            }
            break
          case '&&':
          case '||': {
            const left = requireBoolean(value, binary.left.span)
            const shortCircuit = binary.operator === '&&' ? !left : left
            if (shortCircuit) {
              continue
            }
            pending.push({ kind: 'logicalRight', span: binary.right.span })
            break
          }
          default:
            pending.push({
              kind: 'arithmeticRight',
              operator: binary.operator,
              left: requireNumber(value, binary.left.span),
              rightSpan: binary.right.span,
              span: binary.span,
            })
        }
        value = descendToLiteral(binary.right, pending)
        break
      }
      case 'arithmeticRight': {
        const right = requireNumber(value, frame.rightSpan)
        if (frame.operator === '/' && right === 0) {
          throw validationError('Division by zero', frame.rightSpan)
        }
        const result = arithmeticOperations[frame.operator](frame.left, right)
        if (!Number.isFinite(result)) {
          throw validationError('Arithmetic result must be finite', frame.span)
        }
        value = result
        break
      }
      case 'logicalRight':
        requireBoolean(value, frame.span)
        break
    }
  }
  return value
}

function descendToLiteral(
  node: ParsedExpressionAst,
  pending: PendingOperation[],
): LiteralValue {
  while (node.kind !== 'literal') {
    if (node.kind === 'conditional') {
      pending.push({ kind: 'condition', node })
      node = node.condition
    } else {
      pending.push({ kind: 'left', node })
      node = node.left
    }
  }
  return node.value
}

function requireNumber(value: LiteralValue, span: SourceSpan): number {
  if (typeof value !== 'number') {
    throw validationError('Arithmetic operands must be numbers', span)
  }
  return value
}

function requireBoolean(value: LiteralValue, span: SourceSpan): boolean {
  if (typeof value !== 'boolean') {
    throw validationError('Logical operands must be booleans', span)
  }
  return value
}

function validationError(
  message: string,
  span: SourceSpan,
): ZslValidationError {
  return new ZslValidationError([{ kind: 'validation', message, span }])
}
