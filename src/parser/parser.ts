import type {
  ArithmeticOperator,
  ParsedExpressionAst,
  SourceSpan,
} from '../ast/index.js'
import { ZslValidationError } from '../exception/index.js'
import { readToken } from '../lexer/index.js'

const precedence: Readonly<Record<ArithmeticOperator, number>> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

type PendingExpression =
  | { readonly kind: 'group'; readonly start: number }
  | {
      readonly kind: 'binary'
      readonly operator: ArithmeticOperator
      readonly left: ParsedExpressionAst
    }

export function parseExpression(source: string): ParsedExpressionAst {
  const pending: PendingExpression[] = []
  let next = readToken(source)

  while (true) {
    while (next.kind === 'leftParen') {
      pending.push({ kind: 'group', start: next.span.start })
      next = readToken(source, next.span.end)
    }
    if (next.kind !== 'literal') {
      throw syntaxError('Expected an operand', next.span)
    }
    let expression: ParsedExpressionAst = {
      kind: 'literal',
      value: next.value,
      span: next.span,
    }
    next = readToken(source, next.span.end)

    for (let frame = pending.at(-1); frame; frame = pending.at(-1)) {
      if (frame.kind === 'group') {
        if (next.kind === 'operator') {
          break
        }
        if (next.kind !== 'rightParen') {
          throw syntaxError("Expected ')' after expression", next.span)
        }
        pending.pop()
        expression = {
          ...expression,
          span: { start: frame.start, end: next.span.end },
        }
        next = readToken(source, next.span.end)
        continue
      }
      if (
        next.kind === 'operator' &&
        precedence[next.operator] > precedence[frame.operator]
      ) {
        break
      }

      pending.pop()
      expression = {
        kind: 'binary',
        operator: frame.operator,
        left: frame.left,
        right: expression,
        span: { start: frame.left.span.start, end: expression.span.end },
      }
    }

    if (next.kind === 'eof') {
      return expression
    }
    if (next.kind !== 'operator') {
      throw syntaxError('Unexpected token after expression', next.span)
    }
    pending.push({ kind: 'binary', operator: next.operator, left: expression })
    next = readToken(source, next.span.end)
  }
}

function syntaxError(message: string, span: SourceSpan): ZslValidationError {
  return new ZslValidationError([{ kind: 'syntax', message, span }])
}
