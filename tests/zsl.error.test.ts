import assert from 'node:assert/strict'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Expression } from '../src/expression/index.js'
import { parseExpression } from '../src/parser/index.js'
import {
  ZSL,
  ZslDivisionByZeroError,
  ZslError,
  ZslExpectedArgumentDelimiterError,
  ZslInsufficientArgumentsError,
  ZslInvalidArgumentTypeError,
  ZslInvalidArithmeticOperandTypeError,
  ZslInvalidConditionTypeError,
  ZslInvalidFunctionResultError,
  ZslInvalidLogicalOperandTypeError,
  ZslInvalidStringCharacterError,
  type ZslIssue,
  ZslMissingCallOpeningParenError,
  ZslMissingConditionalColonError,
  ZslMissingFractionDigitError,
  ZslMissingGroupClosingParenError,
  ZslMissingOperandError,
  ZslNonFiniteArithmeticResultError,
  ZslNonFiniteNumberLiteralError,
  ZslSyntaxError,
  ZslTrailingTokenError,
  ZslUnexpectedCharacterError,
  ZslUnknownFunctionError,
  ZslUnsupportedEscapeError,
  ZslUnsupportedExpressionNodeError,
  ZslUnterminatedStringError,
  ZslUnterminatedTemplateExpressionError,
  ZslValidationError,
} from '../src/zsl/index.js'

const zsl = new ZSL()

describe('ZSL errors', () => {
  it('exports constructible categories with narrowed diagnostic kinds', () => {
    const span = { start: 2, end: 3 }
    const syntaxIssue: ZslIssue<'syntax'> = {
      kind: 'syntax',
      message: 'syntax',
      span,
    }
    const validationIssue: ZslIssue<'validation'> = {
      kind: 'validation',
      message: 'validation',
      span,
    }
    const syntaxError = new ZslSyntaxError([syntaxIssue])
    const validationError = new ZslValidationError([validationIssue])

    expect(syntaxError).toBeInstanceOf(ZslError)
    expect(syntaxError).toBeInstanceOf(Error)
    expect(syntaxError).not.toBeInstanceOf(ZslValidationError)
    expect(syntaxError).toMatchObject({
      name: 'ZslSyntaxError',
      code: 'SYNTAX_ERROR',
      message: 'ZSL syntax error',
      issues: [syntaxIssue],
    })
    expect(validationError).toBeInstanceOf(ZslError)
    expect(validationError).toBeInstanceOf(Error)
    expect(validationError).not.toBeInstanceOf(ZslSyntaxError)
    expect(validationError).toMatchObject({
      name: 'ZslValidationError',
      code: 'VALIDATION_ERROR',
      message: 'ZSL validation failed',
      issues: [validationIssue],
    })

    expectTypeOf(syntaxError.issues).toEqualTypeOf<
      readonly ZslIssue<'syntax'>[]
    >()
    expectTypeOf(validationError.issues).toEqualTypeOf<
      readonly ZslIssue<'validation'>[]
    >()
    expectTypeOf<
      ZslDivisionByZeroError['code']
    >().toEqualTypeOf<'DIVISION_BY_ZERO'>()
  })

  it.each([
    {
      input: '1 + 😀',
      type: ZslUnexpectedCharacterError,
      code: 'UNEXPECTED_CHARACTER',
      message: 'Unexpected character',
      span: { start: 4, end: 6 },
    },
    {
      input: '"\\q"',
      type: ZslUnsupportedEscapeError,
      code: 'UNSUPPORTED_ESCAPE',
      message: 'Unsupported escape sequence',
      span: { start: 1, end: 3 },
    },
    {
      input: "'line\nfeed'",
      type: ZslInvalidStringCharacterError,
      code: 'INVALID_STRING_CHARACTER',
      message: 'Unexpected control character in string',
      span: { start: 5, end: 6 },
    },
    {
      input: "'open",
      type: ZslUnterminatedStringError,
      code: 'UNTERMINATED_STRING',
      message: 'Unterminated string',
      span: { start: 0, end: 5 },
    },
    {
      input: '14.',
      type: ZslMissingFractionDigitError,
      code: 'MISSING_FRACTION_DIGIT',
      message: 'Expected a digit after the decimal point',
      span: { start: 2, end: 3 },
    },
    {
      input: '9'.repeat(309),
      type: ZslNonFiniteNumberLiteralError,
      code: 'NON_FINITE_NUMBER_LITERAL',
      message: 'Number must be finite',
      span: { start: 0, end: 309 },
    },
    {
      input: 'GET',
      type: ZslMissingCallOpeningParenError,
      code: 'MISSING_CALL_OPENING_PAREN',
      message: "Expected '(' after function name",
      span: { start: 0, end: 3 },
    },
    {
      input: '1 +',
      type: ZslMissingOperandError,
      code: 'MISSING_OPERAND',
      message: 'Expected an operand',
      span: { start: 3, end: 3 },
    },
    {
      input: '(1',
      type: ZslMissingGroupClosingParenError,
      code: 'MISSING_GROUP_CLOSING_PAREN',
      message: "Expected ')' after expression",
      span: { start: 2, end: 2 },
    },
    {
      input: "GET('event' 'severity')",
      type: ZslExpectedArgumentDelimiterError,
      code: 'EXPECTED_ARGUMENT_DELIMITER',
      message: "Expected ',' or ')' after argument",
      span: { start: 12, end: 22 },
    },
    {
      input: 'true ? 1',
      type: ZslMissingConditionalColonError,
      code: 'MISSING_CONDITIONAL_COLON',
      message: "Expected ':' after the true branch",
      span: { start: 8, end: 8 },
    },
    {
      input: '1 2',
      type: ZslTrailingTokenError,
      code: 'TRAILING_TOKEN',
      message: 'Unexpected token after expression',
      span: { start: 2, end: 3 },
    },
  ])('reports $code while parsing', ({ input, type, code, message, span }) => {
    assert.throws(
      () => parseExpression(input),
      (error: unknown) => {
        expect(error).toBeInstanceOf(type)
        expect(error).toBeInstanceOf(ZslSyntaxError)
        expect(error).toMatchObject({
          name: type.name,
          code,
          message: 'ZSL syntax error',
          issues: [{ kind: 'syntax', message, span }],
        })
        return true
      },
    )
  })

  it('reports UNTERMINATED_TEMPLATE_EXPRESSION while scanning the template', () => {
    assert.throws(
      () => zsl.compile('prefix ${1'),
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZslUnterminatedTemplateExpressionError)
        expect(error).toBeInstanceOf(ZslSyntaxError)
        expect(error).toMatchObject({
          name: 'ZslUnterminatedTemplateExpressionError',
          code: 'UNTERMINATED_TEMPLATE_EXPRESSION',
          message: 'ZSL syntax error',
          issues: [
            {
              kind: 'syntax',
              message: 'Unterminated template expression',
              span: { start: 7, end: 10 },
            },
          ],
        })
        return true
      },
    )
  })

  it.each([
    {
      input: 'missing()',
      type: ZslUnknownFunctionError,
      code: 'UNKNOWN_FUNCTION',
      message: "Unknown function 'missing'",
      details: { functionName: 'missing' },
    },
    {
      input: 'GET()',
      type: ZslInsufficientArgumentsError,
      code: 'INSUFFICIENT_ARGUMENTS',
      message: "'GET' requires at least 2 arguments",
      details: { functionName: 'GET', minimumArguments: 2, actualArguments: 0 },
    },
  ])(
    'reports $code while checking calls',
    ({ input, type, code, message, details }) => {
      assert.throws(
        () => zsl.compile(`\${${input}}`),
        (error: unknown) => {
          expect(error).toBeInstanceOf(type)
          expect(error).toBeInstanceOf(ZslValidationError)
          expect(error).toMatchObject({
            name: type.name,
            code,
            message: 'ZSL validation failed',
            issues: [
              {
                kind: 'validation',
                message,
                span: { start: 2, end: input.length + 2 },
              },
            ],
            ...details,
          })
          return true
        },
      )
    },
  )

  it.each([
    {
      input: "GET('event', false)",
      type: ZslInvalidArgumentTypeError,
      code: 'INVALID_ARGUMENT_TYPE',
      message: 'GET arguments must be strings',
      span: { start: 15, end: 20 },
      details: { functionName: 'GET', expectedType: 'string' },
    },
    {
      input: "GET('event', 'value')",
      type: ZslInvalidFunctionResultError,
      code: 'INVALID_FUNCTION_RESULT',
      message:
        'GET result must be a string, a boolean, null, or a finite number',
      span: { start: 2, end: 23 },
      details: { functionName: 'GET' },
    },
    {
      input: '1 ? 2 : 3',
      type: ZslInvalidConditionTypeError,
      code: 'INVALID_CONDITION_TYPE',
      message: 'Conditional condition must be a boolean',
      span: { start: 2, end: 3 },
    },
    {
      input: '1 / 0',
      type: ZslDivisionByZeroError,
      code: 'DIVISION_BY_ZERO',
      message: 'Division by zero',
      span: { start: 6, end: 7 },
    },
    {
      input: `${'9'.repeat(308)} * 2`,
      type: ZslNonFiniteArithmeticResultError,
      code: 'NON_FINITE_ARITHMETIC_RESULT',
      message: 'Arithmetic result must be finite',
      span: { start: 2, end: 314 },
    },
    {
      input: '1 + true',
      type: ZslInvalidArithmeticOperandTypeError,
      code: 'INVALID_ARITHMETIC_OPERAND_TYPE',
      message: 'Arithmetic operands must be numbers',
      span: { start: 6, end: 10 },
    },
    {
      input: 'true && 1',
      type: ZslInvalidLogicalOperandTypeError,
      code: 'INVALID_LOGICAL_OPERAND_TYPE',
      message: 'Logical operands must be booleans',
      span: { start: 10, end: 11 },
    },
  ])(
    'reports $code while evaluating',
    ({ input, type, code, message, span, details }) => {
      const expression = zsl.compile(`\${${input}}`)
      assert.throws(
        () => expression.evaluate({ event: { value: {} } }),
        (error: unknown) => {
          expect(error).toBeInstanceOf(type)
          expect(error).toBeInstanceOf(ZslValidationError)
          expect(error).toMatchObject({
            name: type.name,
            code,
            message: 'ZSL validation failed',
            issues: [{ kind: 'validation', message, span }],
            ...details,
          })
          return true
        },
      )
    },
  )

  it('reports UNSUPPORTED_EXPRESSION_NODE without a source diagnostic', () => {
    const node = parseExpression('true')
    Reflect.set(node, 'kind', 'unsupported')
    const expression = new Expression([
      { kind: 'expression', expression: node },
    ])

    assert.throws(
      () => expression.getAstSnapshot(),
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZslUnsupportedExpressionNodeError)
        expect(error).toBeInstanceOf(ZslError)
        expect(error).not.toBeInstanceOf(ZslSyntaxError)
        expect(error).not.toBeInstanceOf(ZslValidationError)
        expect(error).toMatchObject({
          name: 'ZslUnsupportedExpressionNodeError',
          code: 'UNSUPPORTED_EXPRESSION_NODE',
          message: 'Unsupported expression node',
          issues: [],
        })
        return true
      },
    )
  })
})
