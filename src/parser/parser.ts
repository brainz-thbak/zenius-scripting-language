import type { LiteralAst } from '../ast/index.js'
import { ZslValidationError } from '../exception/index.js'
import { readToken } from '../lexer/index.js'

export function parseExpression(source: string): LiteralAst {
  const literal = readToken(source)
  if (literal.kind === 'eof') {
    throw new ZslValidationError([
      { kind: 'syntax', message: 'Expected a literal', span: literal.span },
    ])
  }

  const next = readToken(source, literal.span.end)
  if (next.kind !== 'eof') {
    throw new ZslValidationError([
      {
        kind: 'syntax',
        message: 'Unexpected token after literal',
        span: next.span,
      },
    ])
  }

  return { kind: 'literal', value: literal.value, span: literal.span }
}
