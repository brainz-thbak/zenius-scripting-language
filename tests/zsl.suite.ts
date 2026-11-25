import { describe, expect, it } from 'vitest'
import { type Context, evaluationCases, parseRejectCases } from './zsl.cases.js'

export function registerDslTests<Ast>(engine: {
  parse(input: string): Ast
  evaluate(ast: Ast, context: Context): unknown
}) {
  describe('DSL: syntax rejected by parser itself', () => {
    it.each(parseRejectCases)('$name: $input', ({ input }) => {
      expect(() => engine.parse(input)).toThrow()
    })
  })
  describe('DSL: evaluation', () => {
    it.each(evaluationCases)('$name: $input', ({ input, expected }) => {
      const ast = engine.parse(input)
      expect(engine.evaluate(ast, {})).toEqual(expected)
    })
  })
}
