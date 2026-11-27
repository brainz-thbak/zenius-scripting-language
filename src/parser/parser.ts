import type {
  BinaryOperator,
  CallAst,
  ExpressionAst,
  SourceSpan,
} from '../ast/index.js'
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

const precedence: Readonly<Record<BinaryOperator, number>> = {
  '??': 1,
  '||': 2,
  '&&': 3,
  '==': 4,
  '!=': 4,
  '<': 5,
  '<=': 5,
  '>': 5,
  '>=': 5,
  '+': 6,
  '-': 6,
  '*': 7,
  '/': 7,
}

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
  const readAt = (offset: number) => readToken(source, offset, end)
  let expression: ExpressionAst | undefined

  consumeToken: for (
    let token = readAt(start);
    ;
    token = readAt(token.span.end)
  ) {
    if (expression === undefined) {
      switch (token.kind) {
        case 'leftParen':
          pending.push({ kind: 'group', start: token.span.start })
          continue
        case 'identifier': {
          const open = readAt(token.span.end)
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
          token = open
          continue
        }
        case 'literal':
          expression = { kind: 'literal', value: token.value, span: token.span }
          continue
        case 'rightParen': {
          const call = pending.at(-1)
          if (call?.kind === 'call' && call.args.length === 0) {
            pending.pop()
            expression = finishCall(call, token.span.end)
            continue
          }
          break
        }
      }
      throw new ZslMissingOperandError(token.span)
    }

    for (
      let frame = pending.at(-1);
      frame && shouldReduce(frame, token);
      frame = pending.at(-1)
    ) {
      pending.pop()
      switch (frame.kind) {
        case 'binary':
          expression = {
            kind: 'binary',
            operator: frame.operator,
            left: frame.left,
            right: expression,
            span: { start: frame.left.span.start, end: expression.span.end },
          }
          break
        case 'group':
          if (token.kind !== 'rightParen') {
            throw new ZslMissingGroupClosingParenError(token.span)
          }
          expression = {
            ...expression,
            span: { start: frame.start, end: token.span.end },
          }
          continue consumeToken
        case 'call':
          if (token.kind !== 'comma' && token.kind !== 'rightParen') {
            throw new ZslExpectedArgumentDelimiterError(token.span)
          }
          frame.args.push(expression)
          if (token.kind === 'comma') {
            pending.push(frame)
            expression = undefined
          } else {
            expression = finishCall(frame, token.span.end)
          }
          continue consumeToken
        case 'awaitingColon':
          if (token.kind !== 'colon') {
            throw new ZslMissingConditionalColonError(token.span)
          }
          pending.push({
            kind: 'awaitingFalseBranch',
            condition: frame.condition,
            whenTrue: expression,
          })
          expression = undefined
          continue consumeToken
        case 'awaitingFalseBranch':
          expression = {
            kind: 'conditional',
            condition: frame.condition,
            whenTrue: frame.whenTrue,
            whenFalse: expression,
            span: {
              start: frame.condition.span.start,
              end: expression.span.end,
            },
          }
          break
      }
    }

    switch (token.kind) {
      case 'eof':
        return expression
      case 'operator':
        pending.push({
          kind: 'binary',
          operator: token.operator,
          left: expression,
        })
        break
      case 'question':
        pending.push({ kind: 'awaitingColon', condition: expression })
        break
      default:
        throw new ZslTrailingTokenError(token.span)
    }
    expression = undefined
  }
}

function finishCall(call: PendingCall, end: number): CallAst {
  return {
    kind: 'call',
    name: call.name,
    args: call.args,
    span: { start: call.start, end },
  }
}

function shouldReduce(frame: PendingExpression, token: Token): boolean {
  switch (token.kind) {
    case 'operator':
    case 'question':
      return (
        frame.kind === 'binary' &&
        (token.kind === 'question' ||
          precedence[frame.operator] >= precedence[token.operator])
      )
    default:
      return true
  }
}
