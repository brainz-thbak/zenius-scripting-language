import type { SourceSpan } from '../ast/index.js'
import type { ZslIssue } from './types.js'
import { ZslError } from './zsl-error.js'

export class ZslSyntaxError extends ZslError<ZslIssue<'syntax'>> {
  override readonly name: string = 'ZslSyntaxError'
  override readonly code: string = 'SYNTAX_ERROR'

  constructor(issues: readonly ZslIssue<'syntax'>[]) {
    super('ZSL syntax error', issues)
  }
}

export class ZslUnexpectedCharacterError extends ZslSyntaxError {
  override readonly name = 'ZslUnexpectedCharacterError'
  override readonly code = 'UNEXPECTED_CHARACTER'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: 'Unexpected character', span }])
  }
}

export class ZslUnsupportedEscapeError extends ZslSyntaxError {
  override readonly name = 'ZslUnsupportedEscapeError'
  override readonly code = 'UNSUPPORTED_ESCAPE'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: 'Unsupported escape sequence', span }])
  }
}

export class ZslInvalidStringCharacterError extends ZslSyntaxError {
  override readonly name = 'ZslInvalidStringCharacterError'
  override readonly code = 'INVALID_STRING_CHARACTER'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: 'Unexpected control character in string',
        span,
      },
    ])
  }
}

export class ZslUnterminatedStringError extends ZslSyntaxError {
  override readonly name = 'ZslUnterminatedStringError'
  override readonly code = 'UNTERMINATED_STRING'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: 'Unterminated string', span }])
  }
}

export class ZslMissingFractionDigitError extends ZslSyntaxError {
  override readonly name = 'ZslMissingFractionDigitError'
  override readonly code = 'MISSING_FRACTION_DIGIT'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'syntax',
        message: 'Expected a digit after the decimal point',
        span,
      },
    ])
  }
}

export class ZslNonFiniteNumberLiteralError extends ZslSyntaxError {
  override readonly name = 'ZslNonFiniteNumberLiteralError'
  override readonly code = 'NON_FINITE_NUMBER_LITERAL'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: 'Number must be finite', span }])
  }
}

export class ZslMissingCallOpeningParenError extends ZslSyntaxError {
  override readonly name = 'ZslMissingCallOpeningParenError'
  override readonly code = 'MISSING_CALL_OPENING_PAREN'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: "Expected '(' after function name", span },
    ])
  }
}

export class ZslMissingOperandError extends ZslSyntaxError {
  override readonly name = 'ZslMissingOperandError'
  override readonly code = 'MISSING_OPERAND'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: 'Expected an operand', span }])
  }
}

export class ZslMissingGroupClosingParenError extends ZslSyntaxError {
  override readonly name = 'ZslMissingGroupClosingParenError'
  override readonly code = 'MISSING_GROUP_CLOSING_PAREN'

  constructor(span: SourceSpan) {
    super([{ kind: 'syntax', message: "Expected ')' after expression", span }])
  }
}

export class ZslExpectedArgumentDelimiterError extends ZslSyntaxError {
  override readonly name = 'ZslExpectedArgumentDelimiterError'
  override readonly code = 'EXPECTED_ARGUMENT_DELIMITER'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: "Expected ',' or ')' after argument", span },
    ])
  }
}

export class ZslMissingConditionalColonError extends ZslSyntaxError {
  override readonly name = 'ZslMissingConditionalColonError'
  override readonly code = 'MISSING_CONDITIONAL_COLON'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: "Expected ':' after the true branch", span },
    ])
  }
}

export class ZslTrailingTokenError extends ZslSyntaxError {
  override readonly name = 'ZslTrailingTokenError'
  override readonly code = 'TRAILING_TOKEN'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: 'Unexpected token after expression', span },
    ])
  }
}

export class ZslUnterminatedTemplateExpressionError extends ZslSyntaxError {
  override readonly name = 'ZslUnterminatedTemplateExpressionError'
  override readonly code = 'UNTERMINATED_TEMPLATE_EXPRESSION'

  constructor(span: SourceSpan) {
    super([
      { kind: 'syntax', message: 'Unterminated template expression', span },
    ])
  }
}
