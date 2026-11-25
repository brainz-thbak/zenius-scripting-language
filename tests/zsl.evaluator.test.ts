import { describe, expect, it } from 'vitest'
import { evaluateExpression } from '../src/evaluator/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'
import {
  arithmeticEvaluationCases,
  literalEvaluationCases,
} from './zsl.cases.js'

const overflowingProduct = `${'9'.repeat(308)} * 2`

describe('evaluateExpression', () => {
  it.each([...literalEvaluationCases, ...arithmeticEvaluationCases])(
    'evaluates $name',
    ({ input, expected }) => {
      expect(evaluateExpression(parseExpression(input))).toBe(expected)
    },
  )

  it('evaluates 20,000 left-associative additions', () => {
    const additions = 20_000
    const ast = parseExpression(`${'1+'.repeat(additions)}1`)

    expect(evaluateExpression(ast)).toBe(additions + 1)
  })

  it.each([
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
