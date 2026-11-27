import type {
  ArithmeticOperator,
  CallAst,
  EqualityOperator,
  ExpressionAst,
  LiteralValue,
  NumericValue,
  OrderingOperator,
  SourceSpan,
} from '../ast/index.js'
import {
  ZslDivisionByZeroError,
  ZslInvalidArithmeticOperandTypeError,
  ZslInvalidComparisonOperandTypeError,
  ZslInvalidConditionTypeError,
  ZslInvalidLogicalOperandTypeError,
  ZslNonFiniteArithmeticResultError,
  type ZslValidationError,
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

const orderingOperations: Readonly<
  Record<OrderingOperator, (left: NumericValue, right: NumericValue) => boolean>
> = {
  '<': (left, right) => left < right,
  '<=': (left, right) => left <= right,
  '>': (left, right) => left > right,
  '>=': (left, right) => left >= right,
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
      readonly left: NumericValue
      readonly rightSpan: SourceSpan
      readonly span: SourceSpan
    }
  | {
      readonly kind: 'orderingRight'
      readonly operator: OrderingOperator
      readonly left: NumericValue
      readonly rightSpan: SourceSpan
    }
  | {
      readonly kind: 'equalityRight'
      readonly operator: EqualityOperator
      readonly left: LiteralValue
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
          case '<':
          case '<=':
          case '>':
          case '>=':
            pending.push({
              kind: 'orderingRight',
              operator: binary.operator,
              left: requireNumeric(
                value,
                binary.left.span,
                ZslInvalidComparisonOperandTypeError,
              ),
              rightSpan: binary.right.span,
            })
            break
          case '==':
          case '!=':
            pending.push({
              kind: 'equalityRight',
              operator: binary.operator,
              left: value,
            })
            break
          default:
            pending.push({
              kind: 'arithmeticRight',
              operator: binary.operator,
              left: requireNumeric(value, binary.left.span),
              rightSpan: binary.right.span,
              span: binary.span,
            })
        }
        value = descendToValue(binary.right, pending, context)
        break
      }
      case 'arithmeticRight': {
        const right = requireNumeric(value, frame.rightSpan)
        if (frame.operator === '/' && (right === 0 || right === 0n)) {
          throw new ZslDivisionByZeroError(frame.rightSpan)
        }
        const result = evaluateArithmetic(frame.operator, frame.left, right)
        if (!Number.isFinite(Number(result))) {
          throw new ZslNonFiniteArithmeticResultError(frame.span)
        }
        value = result
        break
      }
      case 'orderingRight': {
        const right = requireNumeric(
          value,
          frame.rightSpan,
          ZslInvalidComparisonOperandTypeError,
        )
        value = orderingOperations[frame.operator](frame.left, right)
        break
      }
      case 'equalityRight': {
        const equal = valuesEqual(frame.left, value)
        value = frame.operator === '==' ? equal : !equal
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

function evaluateArithmetic(
  operator: ArithmeticOperator,
  left: NumericValue,
  right: NumericValue,
): NumericValue {
  if (
    (typeof left === 'bigint' || typeof right === 'bigint') &&
    (typeof left === 'bigint' || Number.isInteger(left)) &&
    (typeof right === 'bigint' || Number.isInteger(right))
  ) {
    const integerLeft = BigInt(left)
    const integerRight = BigInt(right)
    switch (operator) {
      case '+':
        return integerLeft + integerRight
      case '-':
        return integerLeft - integerRight
      case '*':
        return integerLeft * integerRight
      case '/':
        if (integerLeft % integerRight === 0n) {
          return integerLeft / integerRight
        }
        break
    }
  }
  return arithmeticOperations[operator](Number(left), Number(right))
}

function valuesEqual(left: LiteralValue, right: LiteralValue): boolean {
  if (typeof left === 'number' && typeof right === 'bigint') {
    return Number.isInteger(left) && BigInt(left) === right
  }
  if (typeof left === 'bigint' && typeof right === 'number') {
    return Number.isInteger(right) && left === BigInt(right)
  }
  return left === right
}

function requireNumeric(
  value: LiteralValue,
  span: SourceSpan,
  OperandTypeError: new (
    span: SourceSpan,
  ) => ZslValidationError = ZslInvalidArithmeticOperandTypeError,
): NumericValue {
  if (typeof value !== 'number' && typeof value !== 'bigint') {
    throw new OperandTypeError(span)
  }
  return value
}

function requireBoolean(value: LiteralValue, span: SourceSpan): boolean {
  if (typeof value !== 'boolean') {
    throw new ZslInvalidLogicalOperandTypeError(span)
  }
  return value
}
