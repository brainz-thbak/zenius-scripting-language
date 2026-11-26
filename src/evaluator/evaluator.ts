import type {
  ArithmeticOperator,
  CallAst,
  ExpressionAst,
  LiteralValue,
  SourceSpan,
} from '../ast/index.js'
import {
  ZslDivisionByZeroError,
  ZslInvalidArithmeticOperandTypeError,
  ZslInvalidConditionTypeError,
  ZslInvalidLogicalOperandTypeError,
  ZslNonFiniteArithmeticResultError,
} from '../exception/index.js'
import type { ZslContext } from '../expression/index.js'
import {
  type EvaluateFunction,
  type EvaluatedArgument,
  resolveCall,
} from '../functions/functions.js'

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
      readonly node: Extract<ExpressionAst, { kind: 'conditional' }>
    }
  | {
      readonly kind: 'left'
      readonly node: Extract<ExpressionAst, { kind: 'binary' }>
    }
  | {
      readonly kind: 'arithmeticRight'
      readonly operator: ArithmeticOperator
      readonly left: number
      readonly rightSpan: SourceSpan
      readonly span: SourceSpan
    }
  | { readonly kind: 'logicalRight'; readonly span: SourceSpan }
  | {
      readonly kind: 'call'
      readonly node: CallAst
      readonly evaluate: EvaluateFunction
      readonly args: EvaluatedArgument[]
      argumentSpan: SourceSpan
    }

export function evaluateExpression(
  ast: ExpressionAst,
  context: ZslContext = {},
): LiteralValue {
  const pending: PendingOperation[] = []
  let value = descendToValue(ast, pending, context)

  for (let frame = pending.pop(); frame; frame = pending.pop()) {
    switch (frame.kind) {
      case 'condition': {
        const { condition, whenTrue, whenFalse } = frame.node
        if (typeof value !== 'boolean') {
          throw new ZslInvalidConditionTypeError(condition.span)
        }
        value = descendToValue(value ? whenTrue : whenFalse, pending, context)
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
        value = descendToValue(binary.right, pending, context)
        break
      }
      case 'arithmeticRight': {
        const right = requireNumber(value, frame.rightSpan)
        if (frame.operator === '/' && right === 0) {
          throw new ZslDivisionByZeroError(frame.rightSpan)
        }
        const result = arithmeticOperations[frame.operator](frame.left, right)
        if (!Number.isFinite(result)) {
          throw new ZslNonFiniteArithmeticResultError(frame.span)
        }
        value = result
        break
      }
      case 'logicalRight':
        requireBoolean(value, frame.span)
        break
      case 'call': {
        const { args, node } = frame
        args.push({ value, span: frame.argumentSpan })
        const next = node.args[args.length]
        if (next === undefined) {
          value = frame.evaluate(args, context, node.span)
          break
        }
        frame.argumentSpan = next.span
        pending.push(frame)
        value = descendToValue(next, pending, context)
        break
      }
    }
  }
  return value
}

function descendToValue(
  node: ExpressionAst,
  pending: PendingOperation[],
  context: ZslContext,
): LiteralValue {
  while (node.kind !== 'literal') {
    switch (node.kind) {
      case 'conditional':
        pending.push({ kind: 'condition', node })
        node = node.condition
        break
      case 'binary':
        pending.push({ kind: 'left', node })
        node = node.left
        break
      case 'call': {
        const evaluate = resolveCall(node)
        const first = node.args[0]
        if (first === undefined) {
          return evaluate([], context, node.span)
        }
        pending.push({
          kind: 'call',
          node,
          evaluate,
          args: [],
          argumentSpan: first.span,
        })
        node = first
        break
      }
    }
  }
  return node.value
}

function requireNumber(value: LiteralValue, span: SourceSpan): number {
  if (typeof value !== 'number') {
    throw new ZslInvalidArithmeticOperandTypeError(span)
  }
  return value
}

function requireBoolean(value: LiteralValue, span: SourceSpan): boolean {
  if (typeof value !== 'boolean') {
    throw new ZslInvalidLogicalOperandTypeError(span)
  }
  return value
}
