import { describe, expect, it } from 'vitest'
import { evaluateExpression } from '../src/evaluator/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'
import { evaluationCases } from './zsl.cases.js'

const overflowingProduct = `${'9'.repeat(308)} * 2`

describe('evaluateExpression', () => {
  it.each(evaluationCases)('evaluates $name', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input))).toBe(expected)
  })

  it('evaluates 20,000 left-associative additions', () => {
    const additions = 20_000
    const ast = parseExpression(`${'1+'.repeat(additions)}1`)

    expect(evaluateExpression(ast)).toBe(additions + 1)
  })

  it('evaluates 20,000 nested conditional conditions', () => {
    const depth = 20_000
    const input = `${'('.repeat(depth)}true${'?true:false)'.repeat(depth)}`

    expect(evaluateExpression(parseExpression(input))).toBe(true)
  })

  it.each([
    { input: '(null ?? 5) ? 1 : 2', span: { start: 0, end: 11 } },
    { input: '1 && (1 / 0)', span: { start: 0, end: 1 } },
    { input: 'null || true', span: { start: 0, end: 4 } },
    { input: 'true && (1 + 2)', span: { start: 8, end: 15 } },
    { input: "false || 'x'", span: { start: 9, end: 12 } },
    { input: 'true ? 1 / 0 : 2', span: { start: 11, end: 12 } },
    { input: 'false ? 1 : true + 1', span: { start: 12, end: 16 } },
    { input: 'null ?? (1 / 0)', span: { start: 13, end: 14 } },
    { input: 'true + 1', span: { start: 0, end: 4 } },
    { input: '1 + null', span: { start: 4, end: 8 } },
    { input: '1 / (2 - 2)', span: { start: 4, end: 11 } },
    {
      input: overflowingProduct,
      span: { start: 0, end: overflowingProduct.length },
    },
  ])('reports a validation issue for $input', ({ input, span }) => {
    const ast = parseExpression(input)
    expect(() => evaluateExpression(ast)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [expect.objectContaining({ kind: 'validation', span })],
      }),
    )
  })
})

describe('GET', () => {
  const context = {
    event: {
      severity: 6,
      source: { ip: '192.0.2.1' },
      active: false,
      entry: null,
      entries: [{ count: 0 }],
    },
    keys: { severity: 'severity' },
  }

  it.each([
    { input: "GET('event', 'severity')", expected: 6 },
    { input: "GET('event', 'source', 'ip')", expected: '192.0.2.1' },
    { input: "4 + GET('event', 'severity')", expected: 10 },
    { input: "GET('event', 'active')", expected: false },
    { input: "GET('event', 'entry')", expected: null },
    { input: "GET('event', 'entries', '0', 'count')", expected: 0 },
    { input: "GET('event', 'entries', 'length')", expected: 1 },
    {
      input: "GET(true ? 'event' : 'other', GET('keys', 'severity'))",
      expected: 6,
    },
    { input: "GET('missing', 'key')", expected: null },
    { input: "GET('event', 'missing') ?? 'fallback'", expected: 'fallback' },
    { input: "GET('event', 'severity', 'key')", expected: null },
    { input: "GET('event', 'entry', 'key')", expected: null },
    { input: "false && GET('event', 1)", expected: false },
    { input: "true || GET('event', 1)", expected: true },
    { input: "1 ?? GET('event', 1)", expected: 1 },
    { input: "true ? 1 : GET('event', 1)", expected: 1 },
  ])('evaluates $input', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input), context)).toBe(expected)
  })

  it('evaluates the same AST with each supplied context', () => {
    const ast = parseExpression("GET('event', 'severity')")
    expect(evaluateExpression(ast)).toBeNull()
    expect(evaluateExpression(ast, context)).toBe(6)
    expect(evaluateExpression(ast, { event: { severity: 9 } })).toBe(9)
  })

  it('reads only own data properties at every path segment', () => {
    const data = Object.setPrototypeOf(
      {
        event: Object.setPrototypeOf(
          { ['__proto__']: 'own value', missing: undefined },
          { inherited: 'nested value' },
        ),
      },
      { inherited: { value: 'root value' } },
    )

    for (const input of [
      "GET('inherited', 'value')",
      "GET('event', 'inherited')",
      "GET('event', 'constructor', 'name')",
      "GET('event', 'missing')",
    ]) {
      expect(evaluateExpression(parseExpression(input), data)).toBeNull()
    }
    expect(
      evaluateExpression(parseExpression("GET('event', '__proto__')"), data),
    ).toBe('own value')
  })

  it('skips accessors without invoking their getters', () => {
    const data = {
      get rootAccessor() {
        throw new Error('Unexpected root getter access')
      },
      event: {
        get fieldAccessor() {
          throw new Error('Unexpected field getter access')
        },
      },
    }

    for (const input of [
      "GET('rootAccessor', 'key')",
      "GET('event', 'fieldAccessor')",
      "GET('event', 'fieldAccessor', 'key')",
    ]) {
      expect(evaluateExpression(parseExpression(input), data)).toBeNull()
    }
  })

  it.each([
    { input: 'GET()', source: 'GET()' },
    { input: "GET('event')", source: "GET('event')" },
    { input: 'missing()', source: 'missing()' },
    { input: "GET(false, 'severity')", source: 'false' },
    { input: "GET('event', (1 + 2))", source: '(1 + 2)' },
    { input: "GET('missing', true)", source: 'true' },
    { input: 'GET(1 / 0, false + 1)', source: '0' },
    { input: 'GET(false, 1 / 0)', source: '0' },
  ])('reports a validation issue for $input', ({ input, source }) => {
    const start = input.indexOf(source)
    expect(() => evaluateExpression(parseExpression(input), context)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + source.length },
          }),
        ],
      }),
    )
  })

  it.each([
    { label: 'object', value: {} },
    { label: 'array', value: [] },
    { label: 'function', value: () => 1 },
    { label: 'bigint', value: 1n },
    { label: 'symbol', value: Symbol() },
    { label: 'NaN', value: Number.NaN },
    { label: 'Infinity', value: Number.POSITIVE_INFINITY },
  ])('rejects a final $label value', ({ value }) => {
    const input = "GET('event', 'value')"
    expect(() =>
      evaluateExpression(parseExpression(input), { event: { value } }),
    ).toThrow(
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

  it('evaluates 20,000 nested GET calls', () => {
    const depth = 20_000
    const input = `${"GET('event', ".repeat(depth)}'key'${')'.repeat(depth)}`
    const ast = parseExpression(input)

    expect(evaluateExpression(ast, { event: { key: 'key' } })).toBe('key')
  })
})
