import assert from 'node:assert/strict'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Expression } from '../src/expression/index.js'
import { parseExpression } from '../src/parser/index.js'
import {
  ZSL,
  ZslDivisionByZeroError,
  ZslError,
  ZslExpectedArgumentDelimiterError,
  ZslInputLengthLimitExceededError,
  ZslInsufficientArgumentsError,
  ZslInvalidArgumentTypeError,
  ZslInvalidArithmeticOperandTypeError,
  ZslInvalidConditionTypeError,
  ZslInvalidFunctionResultError,
  ZslInvalidLogicalOperandTypeError,
  ZslInvalidSourceTypeError,
  ZslInvalidStringCharacterError,
  type ZslIssue,
  ZslMissingCallOpeningParenError,
  ZslMissingConditionalColonError,
  ZslMissingFractionDigitError,
  ZslMissingGroupClosingParenError,
  ZslMissingOperandError,
  ZslNonFiniteArithmeticResultError,
  ZslNonFiniteNumberLiteralError,
  ZslOutputLengthLimitExceededError,
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
  // 공개 오류 분류를 생성해 Error 상속 관계와 분류별 이름, 코드, 진단을 확인한다.
  // 타입 검사에서도 진단 kind와 구체 오류의 code가 각각 좁은 타입으로 유지돼야 한다.
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
      message: 'ZSL 문법이 올바르지 않습니다.',
      issues: [syntaxIssue],
    })
    expect(validationError).toBeInstanceOf(ZslError)
    expect(validationError).toBeInstanceOf(Error)
    expect(validationError).not.toBeInstanceOf(ZslSyntaxError)
    expect(validationError).toMatchObject({
      name: 'ZslValidationError',
      code: 'VALIDATION_ERROR',
      message: 'ZSL 검사 또는 평가에 실패했습니다.',
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

  it('preserves methods and span metadata on a custom diagnostic subtype', () => {
    class CustomIssue implements ZslIssue<'syntax'> {
      readonly kind = 'syntax'
      readonly message = 'Unexpected input'
      readonly span = { start: 0, end: 1, sourceName: 'example.zsl' }

      describe() {
        return `${this.span.sourceName}: ${this.message}`
      }
    }

    class CustomError extends ZslError<CustomIssue> {
      override readonly code = 'CUSTOM_ERROR'
    }

    const [issue] = new CustomError('Custom error', [new CustomIssue()]).issues
    assert(issue)
    expect(issue.describe()).toBe('example.zsl: Unexpected input')
  })

  const nonFiniteInteger = '9'.repeat(309)

  // 어휘와 표현식 문법에서 거부하는 입력을 구체 오류별로 검사한다.
  // 공통 오류 메시지와 세부 진단을 구분하고, 문제가 있는 원문 범위를 확인한다.
  it.each([
    {
      input: '1 + 😀',
      type: ZslUnexpectedCharacterError,
      code: 'UNEXPECTED_CHARACTER',
      message: '허용되지 않는 문자입니다.',
      span: { start: 4, end: 6 },
    },
    {
      input: '"\\q"',
      type: ZslUnsupportedEscapeError,
      code: 'UNSUPPORTED_ESCAPE',
      message: '지원하지 않는 이스케이프입니다.',
      span: { start: 1, end: 3 },
    },
    {
      input: "'line\nfeed'",
      type: ZslInvalidStringCharacterError,
      code: 'INVALID_STRING_CHARACTER',
      message: '문자열 리터럴에 이스케이프되지 않은 제어 문자가 있습니다.',
      span: { start: 5, end: 6 },
    },
    {
      input: "'open",
      type: ZslUnterminatedStringError,
      code: 'UNTERMINATED_STRING',
      message: '문자열을 닫는 따옴표가 없습니다.',
      span: { start: 0, end: 5 },
    },
    {
      input: '14.',
      type: ZslMissingFractionDigitError,
      code: 'MISSING_FRACTION_DIGIT',
      message: '소수점 뒤에 숫자가 필요합니다.',
      span: { start: 2, end: 3 },
    },
    {
      input: '14.\u0301',
      type: ZslUnexpectedCharacterError,
      code: 'UNEXPECTED_CHARACTER',
      message: '허용되지 않는 문자입니다.',
      span: { start: 2, end: 4 },
    },
    {
      input: '14.😀',
      type: ZslMissingFractionDigitError,
      code: 'MISSING_FRACTION_DIGIT',
      message: '소수점 뒤에 숫자가 필요합니다.',
      span: { start: 2, end: 3 },
    },
    {
      input: nonFiniteInteger,
      type: ZslNonFiniteNumberLiteralError,
      code: 'NON_FINITE_NUMBER_LITERAL',
      message: '숫자 리터럴은 유한한 값이어야 합니다.',
      span: { start: 0, end: 309 },
    },
    {
      input: `${nonFiniteInteger}\u0301`,
      type: ZslUnexpectedCharacterError,
      code: 'UNEXPECTED_CHARACTER',
      message: '허용되지 않는 문자입니다.',
      span: { start: 308, end: 310 },
    },
    {
      input: `${nonFiniteInteger}😀`,
      type: ZslNonFiniteNumberLiteralError,
      code: 'NON_FINITE_NUMBER_LITERAL',
      message: '숫자 리터럴은 유한한 값이어야 합니다.',
      span: { start: 0, end: 309 },
    },
    {
      input: 'GET',
      type: ZslMissingCallOpeningParenError,
      code: 'MISSING_CALL_OPENING_PAREN',
      message: "함수 이름 뒤에 여는 괄호 '('가 필요합니다.",
      span: { start: 0, end: 3 },
    },
    {
      input: '1 +',
      type: ZslMissingOperandError,
      code: 'MISSING_OPERAND',
      message: '피연산자가 필요합니다.',
      span: { start: 3, end: 3 },
    },
    {
      input: '(1',
      type: ZslMissingGroupClosingParenError,
      code: 'MISSING_GROUP_CLOSING_PAREN',
      message: "표현식 뒤에 닫는 괄호 ')'가 필요합니다.",
      span: { start: 2, end: 2 },
    },
    {
      input: "GET('event' 'severity')",
      type: ZslExpectedArgumentDelimiterError,
      code: 'EXPECTED_ARGUMENT_DELIMITER',
      message: "인자 뒤에 쉼표 ',' 또는 닫는 괄호 ')'가 필요합니다.",
      span: { start: 12, end: 22 },
    },
    {
      input: 'true ? 1',
      type: ZslMissingConditionalColonError,
      code: 'MISSING_CONDITIONAL_COLON',
      message: "조건이 참일 때 평가할 식 뒤에 콜론 ':'이 필요합니다.",
      span: { start: 8, end: 8 },
    },
    {
      input: '1 2',
      type: ZslTrailingTokenError,
      code: 'TRAILING_TOKEN',
      message: '표현식 뒤에 예상하지 못한 토큰이 있습니다.',
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
          message: 'ZSL 문법이 올바르지 않습니다.',
          issues: [{ kind: 'syntax', message, span }],
        })
        return true
      },
    )
  })

  // 템플릿에서 표현식 구간의 닫는 구분자가 빠지면 컴파일이 구간 탐색 단계에서 실패한다.
  // 이 오류의 진단 범위는 여는 구분자부터 템플릿 끝까지다.
  it('reports UNTERMINATED_TEMPLATE_EXPRESSION while scanning the template', () => {
    assert.throws(
      () => zsl.compile('prefix ${1'),
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZslUnterminatedTemplateExpressionError)
        expect(error).toBeInstanceOf(ZslSyntaxError)
        expect(error).toMatchObject({
          name: 'ZslUnterminatedTemplateExpressionError',
          code: 'UNTERMINATED_TEMPLATE_EXPRESSION',
          message: 'ZSL 문법이 올바르지 않습니다.',
          issues: [
            {
              kind: 'syntax',
              message: "템플릿 표현식을 닫는 '}'가 없습니다.",
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
      run: () => Reflect.apply(zsl.compile, zsl, [null]),
      type: ZslInvalidSourceTypeError,
      code: 'INVALID_SOURCE_TYPE',
    },
    {
      run: () => new ZSL({ maxInputLength: 1 }).compile('ab'),
      type: ZslInputLengthLimitExceededError,
      code: 'INPUT_LENGTH_LIMIT_EXCEEDED',
      details: { limit: 1 },
    },
    {
      run: () => new ZSL({ maxOutputLength: 2 }).compile('abc').evaluate(),
      type: ZslOutputLengthLimitExceededError,
      code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED',
      details: { limit: 2 },
    },
  ])('throws the public $code error', ({ run, type, code, details }) => {
    assert.throws(run, (error: unknown) => {
      expect(error).toBeInstanceOf(type)
      expect(error).toBeInstanceOf(ZslError)
      expect(error).toMatchObject({ code, issues: [], ...details })
      return true
    })
  })

  // 컴파일러는 미등록 함수와 인자 수가 부족한 함수를 서로 다른 검사 오류로 보고한다.
  // 함수 이름과 인자 수 정보, 템플릿 원문에서 호출이 차지하는 범위를 함께 확인한다.
  it.each([
    {
      input: 'missing()',
      type: ZslUnknownFunctionError,
      code: 'UNKNOWN_FUNCTION',
      message: "등록되지 않은 함수 'missing'입니다.",
      details: { functionName: 'missing' },
    },
    {
      input: 'GET()',
      type: ZslInsufficientArgumentsError,
      code: 'INSUFFICIENT_ARGUMENTS',
      message: "'GET' 함수에는 인자가 최소 2개 필요합니다.",
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
            message: 'ZSL 검사 또는 평가에 실패했습니다.',
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

  // 컴파일을 통과한 표현식에서 값의 타입이나 연산 결과가 평가 규칙을 위반하는 경우다.
  // 실패 원인별 오류 코드, 추가 정보, 템플릿 원문 기준 진단 범위를 확인한다.
  it.each([
    {
      input: "GET('event', false)",
      type: ZslInvalidArgumentTypeError,
      code: 'INVALID_ARGUMENT_TYPE',
      message: "'GET' 함수의 인자는 문자열 타입이어야 합니다.",
      span: { start: 15, end: 20 },
      details: { functionName: 'GET', expectedType: 'string' },
    },
    {
      input: "GET('event', 'value')",
      type: ZslInvalidFunctionResultError,
      code: 'INVALID_FUNCTION_RESULT',
      message:
        "'GET' 함수의 반환값은 문자열, 불리언, null 또는 유한한 숫자여야 합니다.",
      span: { start: 2, end: 23 },
      details: { functionName: 'GET' },
    },
    {
      input: '1 ? 2 : 3',
      type: ZslInvalidConditionTypeError,
      code: 'INVALID_CONDITION_TYPE',
      message: '삼항 연산자의 조건은 불리언이어야 합니다.',
      span: { start: 2, end: 3 },
    },
    {
      input: '1 / 0',
      type: ZslDivisionByZeroError,
      code: 'DIVISION_BY_ZERO',
      message: '0으로 나눌 수 없습니다.',
      span: { start: 6, end: 7 },
    },
    {
      input: '1 / (9007199254740993 - 9007199254740993)',
      type: ZslDivisionByZeroError,
      code: 'DIVISION_BY_ZERO',
      message: '0으로 나눌 수 없습니다.',
      span: { start: 6, end: 43 },
    },
    {
      input: `${'9'.repeat(308)} * 2`,
      type: ZslNonFiniteArithmeticResultError,
      code: 'NON_FINITE_ARITHMETIC_RESULT',
      message: '산술 연산 결과는 유한한 값이어야 합니다.',
      span: { start: 2, end: 314 },
    },
    {
      input: `${'9'.repeat(308)} * 2.5`,
      type: ZslNonFiniteArithmeticResultError,
      code: 'NON_FINITE_ARITHMETIC_RESULT',
      message: '산술 연산 결과는 유한한 값이어야 합니다.',
      span: { start: 2, end: 316 },
    },
    {
      input: '1 + true',
      type: ZslInvalidArithmeticOperandTypeError,
      code: 'INVALID_ARITHMETIC_OPERAND_TYPE',
      message: '산술 연산의 피연산자는 숫자여야 합니다.',
      span: { start: 6, end: 10 },
    },
    {
      input: 'true && 1',
      type: ZslInvalidLogicalOperandTypeError,
      code: 'INVALID_LOGICAL_OPERAND_TYPE',
      message: '논리 연산의 피연산자는 불리언이어야 합니다.',
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
            message: 'ZSL 검사 또는 평가에 실패했습니다.',
            issues: [{ kind: 'validation', message, span }],
            ...details,
          })
          return true
        },
      )
    },
  )

  it('preserves the source range after a caller edits a previous diagnostic', () => {
    const expression = zsl.compile('${12 / 0}')
    const evaluate = () => expression.evaluate()

    assert.throws(evaluate, (error: unknown) => {
      assert(error instanceof ZslDivisionByZeroError)
      const [issue] = error.issues
      assert(issue)
      expect(issue.span).toEqual({ start: 7, end: 8 })
      Reflect.set(issue.span, 'start', 0)
      return true
    })

    assert.throws(evaluate, (error: unknown) => {
      assert(error instanceof ZslDivisionByZeroError)
      expect(error.issues[0]?.span).toEqual({ start: 7, end: 8 })
      return true
    })
  })

  // 스냅샷을 뜨는 도중 지원하지 않는 AST 노드를 만나면 전용 오류를 보고한다.
  // 이 오류는 AST의 상태를 나타내며 소스 진단 배열은 비어 있다.
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
          message: '지원하지 않는 표현식 노드입니다.',
          issues: [],
        })
        return true
      },
    )
  })
})
