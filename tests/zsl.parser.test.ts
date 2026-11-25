import { describe, expect, it } from 'vitest'
import { ZslValidationError } from '../src/exception/index.js'
import { readToken } from '../src/lexer/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalEvaluationCases, literalParseRejectCases } from './zsl.cases.js'

describe('readToken', () => {
  it('reads a single token at a time from source offsets', () => {
    const source = ' 4 false '
    const first = readToken(source)
    expect(first).toEqual({
      kind: 'literal',
      value: 4,
      span: { start: 1, end: 2 },
    })
    const second = readToken(source, first.span.end)
    expect(second).toEqual({
      kind: 'literal',
      value: false,
      span: { start: 3, end: 8 },
    })
    expect(readToken(source, second.span.end)).toEqual({
      kind: 'eof',
      span: { start: 9, end: 9 },
    })
  })
})

describe('parseExpression', () => {
  it.each(literalEvaluationCases)('parses $name', ({ input, expected }) => {
    expect(parseExpression(input)).toEqual({
      kind: 'literal',
      value: expected,
      span: { start: 0, end: input.length },
    })
  })

  it('measures the original literal in UTF-16 code units', () => {
    expect(parseExpression(" \t'😀\\n'\r\n")).toEqual({
      kind: 'literal',
      value: '😀\n',
      span: { start: 2, end: 8 },
    })
  })

  it.each(literalParseRejectCases)('rejects $name', ({ input, span }) => {
    expect(() => parseExpression(input)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [expect.objectContaining({ kind: 'syntax', span })],
      }),
    )
  })

  it.each(['-4', '1e3', '0x10', 'TRUE', '\u00a04', "'line\nfeed'"])(
    'rejects %j outside the literal grammar',
    (input) => {
      expect(() => parseExpression(input)).toThrow(ZslValidationError)
    },
  )

  it('rejects a decimal that cannot be represented as a finite number', () => {
    const input = '9'.repeat(309)
    expect(() => parseExpression(input)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [
          expect.objectContaining({
            kind: 'syntax',
            span: { start: 0, end: input.length },
          }),
        ],
      }),
    )
  })
})
