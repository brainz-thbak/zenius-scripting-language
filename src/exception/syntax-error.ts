import type { SourceSpan } from '../ast/index.js'
import type { ZslIssue } from './types.js'
import { ZslError } from './zsl-error.js'

export class ZslSyntaxError extends ZslError<ZslIssue<'syntax'>> {
  override readonly name: string = 'ZslSyntaxError'
  override readonly code: string = 'SYNTAX_ERROR'

  constructor(issues: readonly ZslIssue<'syntax'>[]) {
    super('ZSL 문법이 올바르지 않습니다.', issues)
  }
}

export class ZslUnexpectedCharacterError extends ZslSyntaxError {
  override readonly name = 'ZslUnexpectedCharacterError'
  override readonly code = 'UNEXPECTED_CHARACTER'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: '허용되지 않는 문자입니다.', span }])
  }
}

export class ZslUnsupportedEscapeError extends ZslSyntaxError {
  override readonly name = 'ZslUnsupportedEscapeError'
  override readonly code = 'UNSUPPORTED_ESCAPE'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: '지원하지 않는 이스케이프입니다.', span },
    ])
  }
}

export class ZslInvalidStringCharacterError extends ZslSyntaxError {
  override readonly name = 'ZslInvalidStringCharacterError'
  override readonly code = 'INVALID_STRING_CHARACTER'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: '문자열 리터럴에 이스케이프되지 않은 제어 문자가 있습니다.',
        span,
      },
    ])
  }
}

export class ZslUnterminatedStringError extends ZslSyntaxError {
  override readonly name = 'ZslUnterminatedStringError'
  override readonly code = 'UNTERMINATED_STRING'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: '문자열을 닫는 따옴표가 없습니다.', span },
    ])
  }
}

export class ZslMissingFractionDigitError extends ZslSyntaxError {
  override readonly name = 'ZslMissingFractionDigitError'
  override readonly code = 'MISSING_FRACTION_DIGIT'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: '소수점 뒤에 숫자가 필요합니다.',
        span,
      },
    ])
  }
}

export class ZslNonFiniteNumberLiteralError extends ZslSyntaxError {
  override readonly name = 'ZslNonFiniteNumberLiteralError'
  override readonly code = 'NON_FINITE_NUMBER_LITERAL'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: '숫자 리터럴은 유한한 값이어야 합니다.',
        span,
      },
    ])
  }
}

export class ZslMissingCallOpeningParenError extends ZslSyntaxError {
  override readonly name = 'ZslMissingCallOpeningParenError'
  override readonly code = 'MISSING_CALL_OPENING_PAREN'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: "함수 이름 뒤에 여는 괄호 '('가 필요합니다.",
        span,
      },
    ])
  }
}

export class ZslUnknownFunctionError extends ZslSyntaxError {
  override readonly name = 'ZslUnknownFunctionError'
  override readonly code = 'UNKNOWN_FUNCTION'

  constructor(
    readonly functionName: string,
    span: SourceSpan,
  ) {
    super([
      {
        kind: 'syntax',
        message: `등록되지 않은 함수 '${functionName}'입니다.`,
        span,
      },
    ])
  }
}

export class ZslMissingOperandError extends ZslSyntaxError {
  override readonly name = 'ZslMissingOperandError'
  override readonly code = 'MISSING_OPERAND'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: '피연산자가 필요합니다.', span }])
  }
}

export class ZslMissingGroupClosingParenError extends ZslSyntaxError {
  override readonly name = 'ZslMissingGroupClosingParenError'
  override readonly code = 'MISSING_GROUP_CLOSING_PAREN'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: "표현식 뒤에 닫는 괄호 ')'가 필요합니다.",
        span,
      },
    ])
  }
}

export class ZslExpectedArgumentDelimiterError extends ZslSyntaxError {
  override readonly name = 'ZslExpectedArgumentDelimiterError'
  override readonly code = 'EXPECTED_ARGUMENT_DELIMITER'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: "인자 뒤에 쉼표 ',' 또는 닫는 괄호 ')'가 필요합니다.",
        span,
      },
    ])
  }
}

export class ZslMissingConditionalColonError extends ZslSyntaxError {
  override readonly name = 'ZslMissingConditionalColonError'
  override readonly code = 'MISSING_CONDITIONAL_COLON'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: "조건이 참일 때 평가할 식 뒤에 콜론 ':'이 필요합니다.",
        span,
      },
    ])
  }
}

export class ZslTrailingTokenError extends ZslSyntaxError {
  override readonly name = 'ZslTrailingTokenError'
  override readonly code = 'TRAILING_TOKEN'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: '표현식 뒤에 예상하지 못한 토큰이 있습니다.',
        span,
      },
    ])
  }
}

export class ZslUnterminatedTemplateExpressionError extends ZslSyntaxError {
  override readonly name = 'ZslUnterminatedTemplateExpressionError'
  override readonly code = 'UNTERMINATED_TEMPLATE_EXPRESSION'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: "템플릿 표현식을 닫는 '}'가 없습니다.", span },
    ])
  }
}
