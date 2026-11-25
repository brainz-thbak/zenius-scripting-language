import { describe, expect, it } from 'vitest'
import { ZslValidationError } from '../src/exception/index.js'
import { readToken } from '../src/lexer/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalEvaluationCases, parseRejectCases } from './zsl.cases.js'

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

  it('reads null coalescing before a single question mark', () => {
    const source = ' ???:'
    expect(readToken(source)).toEqual({
      kind: 'operator',
      operator: '??',
      span: { start: 1, end: 3 },
    })
    expect(readToken(source, 3)).toEqual({
      kind: 'question',
      span: { start: 3, end: 4 },
    })
    expect(readToken(source, 4)).toEqual({
      kind: 'colon',
      span: { start: 4, end: 5 },
    })
  })

  it('reads arithmetic operators and parentheses with their original ranges', () => {
    const source = '( + )'
    expect(readToken(source)).toEqual({
      kind: 'leftParen',
      span: { start: 0, end: 1 },
    })
    expect(readToken(source, 1)).toEqual({
      kind: 'operator',
      operator: '+',
      span: { start: 2, end: 3 },
    })
    expect(readToken(source, 3)).toEqual({
      kind: 'rightParen',
      span: { start: 4, end: 5 },
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

  it('parses nested calls and an empty argument list with UTF-16 spans', () => {
    expect(parseExpression(" GET ('😀', _next2()) ")).toEqual({
      kind: 'call',
      name: 'GET',
      args: [
        { kind: 'literal', value: '😀', span: { start: 6, end: 10 } },
        {
          kind: 'call',
          name: '_next2',
          args: [],
          span: { start: 12, end: 20 },
        },
      ],
      span: { start: 1, end: 21 },
    })
  })

  it('groups parentheses before multiplication and includes them in the span', () => {
    expect(parseExpression(' (1 + 2) * 3 ')).toEqual({
      kind: 'binary',
      operator: '*',
      left: {
        kind: 'binary',
        operator: '+',
        left: { kind: 'literal', value: 1, span: { start: 2, end: 3 } },
        right: { kind: 'literal', value: 2, span: { start: 6, end: 7 } },
        span: { start: 1, end: 8 },
      },
      right: { kind: 'literal', value: 3, span: { start: 11, end: 12 } },
      span: { start: 1, end: 12 },
    })
  })

  it.each([
    { input: 'true && false && true', operator: '&&' },
    { input: 'true || false || true', operator: '||' },
    { input: 'null ?? null ?? 1', operator: '??' },
  ])(
    'groups repeated $operator operators from the left',
    ({ input, operator }) => {
      expect(parseExpression(input)).toMatchObject({
        kind: 'binary',
        operator,
        left: { kind: 'binary', operator },
        right: { kind: 'literal' },
      })
    },
  )

  it('keeps branch spans inside a grouped conditional', () => {
    expect(parseExpression(' (true ? 1 : 2) ')).toEqual({
      kind: 'conditional',
      condition: { kind: 'literal', value: true, span: { start: 2, end: 6 } },
      whenTrue: { kind: 'literal', value: 1, span: { start: 9, end: 10 } },
      whenFalse: { kind: 'literal', value: 2, span: { start: 13, end: 14 } },
      span: { start: 1, end: 15 },
    })
  })

  it('parses 20,000 nested groups and keeps the full source range', () => {
    const depth = 20_000
    const input = `${'('.repeat(depth)}1${')'.repeat(depth)}`

    expect(parseExpression(input)).toEqual({
      kind: 'literal',
      value: 1,
      span: { start: 0, end: input.length },
    })
  })

  it.each(parseRejectCases)('rejects $name', ({ input, span }) => {
    expect(() => parseExpression(input)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [
          expect.objectContaining(
            span === undefined ? { kind: 'syntax' } : { kind: 'syntax', span },
          ),
        ],
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
