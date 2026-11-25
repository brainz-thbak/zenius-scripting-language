import { describe, expect, it } from 'vitest'
import { evaluateExpression } from '../src/evaluator/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalEvaluationCases } from './zsl.cases.js'

describe('evaluateExpression', () => {
  it.each(literalEvaluationCases)('evaluates $name', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input))).toBe(expected)
  })
})
