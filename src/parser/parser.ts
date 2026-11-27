import type { BinaryOperator, ExpressionAst, SourceSpan } from '../ast/index.js'
import {
  ZslExpectedArgumentDelimiterError,
  ZslMissingCallOpeningParenError,
  ZslMissingConditionalColonError,
  ZslMissingGroupClosingParenError,
  ZslMissingOperandError,
  ZslTrailingTokenError,
  ZslUnknownFunctionError,
} from '../exception/index.js'
import { builtinFunctions } from '../functions/functions.js'
import { type Token, readToken } from '../lexer/index.js'
import { binaryOperatorPrecedence } from '../operators.js'

interface PendingCall {
  readonly kind: 'call'
  readonly name: string
  readonly start: number
  readonly args: ExpressionAst[]
}

type PendingExpression =
  | { readonly kind: 'group'; readonly start: number }
  | PendingCall
  | {
      readonly kind: 'binary'
      readonly operator: BinaryOperator
      readonly left: ExpressionAst
    }
  | {
      readonly kind: 'awaitingColon'
      readonly condition: ExpressionAst
    }
  | {
      readonly kind: 'awaitingFalseBranch'
      readonly condition: ExpressionAst
      readonly whenTrue: ExpressionAst
    }

export function parseExpression(
  source: string,
  { start, end }: SourceSpan = { start: 0, end: source.length },
): ExpressionAst {
  const pending: PendingExpression[] = []
  let offset = start
  let expression: ExpressionAst | undefined

  const readNextToken = () => {
    const token = readToken(source, offset, end)
    offset = token.span.end
    return token
  }

  while (true) {
    const token = readNextToken()
    if (expression === undefined) {
      switch (token.kind) {
        case 'leftParen':
          pending.push({ kind: 'group', start: token.span.start })
          continue
        case 'identifier': {
          const open = readNextToken()
          if (open.kind !== 'leftParen') {
            throw new ZslMissingCallOpeningParenError(token.span)
          }
          if (!builtinFunctions.has(token.name)) {
            throw new ZslUnknownFunctionError(token.name, token.span)
          }
          pending.push({
            kind: 'call',
            name: token.name,
            start: token.span.start,
            args: [],
          })
          continue
        }
        case 'literal':
          expression = { kind: 'literal', value: token.value, span: token.span }
          continue
        case 'rightParen':
          // 피연산자를 기다리는 중에도 닫는 괄호는 빈 호출을 닫을 수 있다.
          break
        default:
          throw new ZslMissingOperandError(token.span)
      }
    } else {
      expression = reduceOperators(pending, expression, token)
      switch (token.kind) {
        case 'operator':
          pending.push({
            kind: 'binary',
            operator: token.operator,
            left: expression,
          })
          expression = undefined
          continue
        case 'question':
          pending.push({ kind: 'awaitingColon', condition: expression })
          expression = undefined
          continue
      }
    }

    const frame = pending.at(-1)
    if (frame?.kind === 'call') {
      if (token.kind !== 'comma' && token.kind !== 'rightParen') {
        throw new ZslExpectedArgumentDelimiterError(token.span)
      }
      if (expression !== undefined) {
        frame.args.push(expression)
      } else if (frame.args.length > 0) {
        throw new ZslMissingOperandError(token.span)
      }
      if (token.kind === 'comma') {
        expression = undefined
        continue
      }
      pending.pop()
      expression = {
        kind: 'call',
        name: frame.name,
        args: frame.args,
        span: { start: frame.start, end: token.span.end },
      }
      continue
    }
    if (expression === undefined) {
      throw new ZslMissingOperandError(token.span)
    }

    if (frame?.kind === 'group') {
      if (token.kind !== 'rightParen') {
        throw new ZslMissingGroupClosingParenError(token.span)
      }
      pending.pop()
      expression = {
        ...expression,
        span: { start: frame.start, end: token.span.end },
      }
      continue
    }
    if (frame?.kind === 'awaitingColon') {
      if (token.kind !== 'colon') {
        throw new ZslMissingConditionalColonError(token.span)
      }
      pending[pending.length - 1] = {
        kind: 'awaitingFalseBranch',
        condition: frame.condition,
        whenTrue: expression,
      }
      expression = undefined
      continue
    }

    if (token.kind === 'eof') {
      return expression
    }
    throw new ZslTrailingTokenError(token.span)
  }
}

function reduceOperators(
  pending: PendingExpression[],
  expression: ExpressionAst,
  token: Token,
): ExpressionAst {
  while (true) {
    const frame = pending.at(-1)
    if (frame?.kind === 'binary') {
      if (
        token.kind === 'operator' &&
        binaryOperatorPrecedence[frame.operator] <
          binaryOperatorPrecedence[token.operator]
      ) {
        return expression
      }
      expression = {
        kind: 'binary',
        operator: frame.operator,
        left: frame.left,
        right: expression,
        span: { start: frame.left.span.start, end: expression.span.end },
      }
    } else if (frame?.kind === 'awaitingFalseBranch') {
      if (token.kind === 'operator' || token.kind === 'question') {
        return expression
      }
      expression = {
        kind: 'conditional',
        condition: frame.condition,
        whenTrue: frame.whenTrue,
        whenFalse: expression,
        span: { start: frame.condition.span.start, end: expression.span.end },
      }
    } else {
      return expression
    }
    pending.pop()
  }
}
