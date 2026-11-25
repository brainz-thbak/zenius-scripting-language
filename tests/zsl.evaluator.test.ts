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
