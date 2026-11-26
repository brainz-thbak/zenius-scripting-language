import { describe, expect, it, vi } from 'vitest'
import { evaluateExpression } from '../src/evaluator/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalCases } from './zsl.literal-cases.js'

const overflowingProduct = `${'9'.repeat(308)} * 2`

describe('evaluateExpression', () => {
  it.each([
    ...literalCases,
    { name: 'addition', input: '1 + 2', expected: 3 },
    { name: 'subtraction', input: '7 - 3', expected: 4 },
    { name: 'multiplication', input: '3 * 4', expected: 12 },
    { name: 'division', input: '8 / 2', expected: 4 },
    { name: 'precedence', input: '1 + 2 * 3', expected: 7 },
    { name: 'parentheses', input: '(1 + 2) * 3', expected: 9 },
    { name: 'nested parentheses', input: '((1 + 2) * (3 + 4))', expected: 21 },
    { name: 'left-associative subtraction', input: '8 - 3 - 2', expected: 3 },
    { name: 'left-associative division', input: '8 / 4 / 2', expected: 1 },
    {
      name: 'equal multiplication and division precedence',
      input: '24 / 3 * 2',
      expected: 16,
    },
    { name: 'decimal division', input: '3 / 2', expected: 1.5 },
    { name: 'subtraction below zero', input: '2 - 5', expected: -3 },
    { name: 'whitespace between tokens', input: '1\t+\r\n2', expected: 3 },
    { name: 'grouped string literal', input: '("event")', expected: 'event' },
    { name: 'ternary true', input: 'true ? 1 : 2', expected: 1 },
    { name: 'ternary false', input: 'false ? 1 : 2', expected: 2 },
    { name: 'logical and', input: 'true && false', expected: false },
    {
      name: 'AND can return a true right operand',
      input: 'true && true',
      expected: true,
    },
    { name: 'logical or', input: 'false || true', expected: true },
    {
      name: 'OR can return a false right operand',
      input: 'false || false',
      expected: false,
    },
    { name: 'null fallback', input: 'null ?? 10', expected: 10 },
    { name: 'zero is not null', input: '0 ?? 10', expected: 0 },
    { name: 'false is not null', input: 'false ?? 10', expected: false },
    { name: 'empty string is not null', input: "'' ?? 10", expected: '' },
    {
      name: 'nested true branch',
      input: 'true ? false ? 1 : 2 : 3',
      expected: 2,
    },
    {
      name: 'nested false branch',
      input: 'false ? 1 : true ? 2 : 3',
      expected: 2,
    },
    {
      name: 'ternaries associate to the right',
      input: 'true ? true : false ? 2 : 3',
      expected: true,
    },
    {
      name: 'arithmetic binds more tightly than OR',
      input: 'true || 1 + 2',
      expected: true,
    },
    {
      name: 'arithmetic binds more tightly than AND',
      input: 'false && 1 + 2',
      expected: false,
    },
    {
      name: 'AND binds more tightly than OR',
      input: 'true || false && false',
      expected: true,
    },
    {
      name: 'parentheses override logical precedence',
      input: '(true || false) && false',
      expected: false,
    },
    {
      name: 'OR binds more tightly than null coalescing',
      input: 'false ?? false || true',
      expected: false,
    },
    {
      name: 'AND binds more tightly than null coalescing',
      input: 'true ?? false && false',
      expected: true,
    },
    {
      name: 'null coalescing binds more tightly than ternary',
      input: 'false??true?1:2',
      expected: 2,
    },
    {
      name: 'skips invalid false branch',
      input: "true ? 'yes' : false + 1",
      expected: 'yes',
    },
    {
      name: 'skips invalid true branch',
      input: "false ? 1 / 0 : 'no'",
      expected: 'no',
    },
    {
      name: 'AND skips invalid right operand',
      input: 'false && 1',
      expected: false,
    },
    {
      name: 'OR skips invalid right operand',
      input: 'true || null',
      expected: true,
    },
    {
      name: 'null coalescing skips invalid fallback',
      input: '0 ?? (1 / 0)',
      expected: 0,
    },
  ])('evaluates $name', ({ input, expected }) => {
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
    const evaluate = () => evaluateExpression(ast)
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
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
    const getRootAccessor = vi.fn(() => 'root accessor value')
    const getFieldAccessor = vi.fn(() => 'field accessor value')
    const data = {
      get rootAccessor() {
        return getRootAccessor()
      },
      event: {
        get fieldAccessor() {
          return getFieldAccessor()
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
    expect(getRootAccessor).not.toHaveBeenCalled()
    expect(getFieldAccessor).not.toHaveBeenCalled()
  })

  it.each(['context', 'nested value'])(
    'does not invoke Proxy traps on the %s',
    (location) => {
      const getOwnPropertyDescriptor = vi.fn(Reflect.getOwnPropertyDescriptor)
      const get = vi.fn(Reflect.get)
      const getPrototypeOf = vi.fn(Reflect.getPrototypeOf)
      const handler = { getOwnPropertyDescriptor, get, getPrototypeOf }
      const target = { event: { severity: 6 } }
      const data =
        location === 'context'
          ? new Proxy<typeof target>(target, handler)
          : { event: new Proxy(target.event, handler) }
      const ast = parseExpression("GET('event', 'severity')")

      try {
        evaluateExpression(ast, data)
      } catch (error) {
        expect(error).toBeInstanceOf(ZslValidationError)
      }

      expect(getOwnPropertyDescriptor).not.toHaveBeenCalled()
      expect(get).not.toHaveBeenCalled()
      expect(getPrototypeOf).not.toHaveBeenCalled()
    },
  )

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
    const ast = parseExpression(input)
    const evaluate = () => evaluateExpression(ast, context)
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
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
    const ast = parseExpression(input)
    const evaluate = () => evaluateExpression(ast, { event: { value } })
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
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
