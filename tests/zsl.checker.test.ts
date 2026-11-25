import { describe, expect, it } from 'vitest'
import { checkExpression } from '../src/checker/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'
import { callCheckRejectCases } from './zsl.cases.js'

describe('checkExpression', () => {
  it.each(callCheckRejectCases)('rejects $name after parsing', ({ input }) => {
    const ast = parseExpression(input)
    expect(() => checkExpression(ast)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start: 0, end: input.length },
          }),
        ],
      }),
    )
  })

  it.each([
    { input: 'true || missing()', first: 'missing()' },
    { input: 'false && missing()', first: 'missing()' },
    { input: '1 ?? missing()', first: 'missing()' },
    { input: 'true ? 1 : missing()', first: 'missing()' },
    { input: 'false ? missing() : 1', first: 'missing()' },
    { input: 'first() + second()', first: 'first()' },
    { input: 'first() ? second() : third()', first: 'first()' },
    { input: 'true ? first() : second()', first: 'first()' },
    { input: 'GET(first(), second())', first: 'first()' },
    { input: 'first(second())', first: 'first(second())' },
    { input: "GET('event') + missing()", first: "GET('event')" },
  ])('checks calls in source order in $input', ({ input, first }) => {
    const ast = parseExpression(input)
    const start = input.indexOf(first)
    expect(() => checkExpression(ast)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + first.length },
          }),
        ],
      }),
    )
  })

  it('checks 20,000 nested GET calls', () => {
    const depth = 20_000
    const input = `${"GET('event', ".repeat(depth)}'key'${')'.repeat(depth)}`

    expect(() => checkExpression(parseExpression(input))).not.toThrow()
  })
})
