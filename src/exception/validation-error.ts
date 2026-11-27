import type { SourceSpan } from '../ast/index.js'
import type { ZslIssue } from './types.js'
import { ZslError } from './zsl-error.js'

const argumentTypeNames = {
  string: '문자열',
  number: '숫자',
  boolean: '불리언',
}

export class ZslValidationError extends ZslError<ZslIssue<'validation'>> {
  override readonly name: string = 'ZslValidationError'
  override readonly code: string = 'VALIDATION_ERROR'

  constructor(issues: readonly ZslIssue<'validation'>[]) {
    super('ZSL 검사 또는 평가에 실패했습니다.', issues)
  }
}

export class ZslInsufficientArgumentsError extends ZslValidationError {
  override readonly name = 'ZslInsufficientArgumentsError'
  override readonly code = 'INSUFFICIENT_ARGUMENTS'
  readonly functionName: string
  readonly minimumArguments: number
  readonly actualArguments: number

  constructor(
    {
      functionName,
      minimumArguments,
      actualArguments,
    }: {
      functionName: string
      minimumArguments: number
      actualArguments: number
    },
    span: SourceSpan,
  ) {
    super([
      {
        kind: 'validation',
        message: `'${functionName}' 함수에는 인자가 최소 ${minimumArguments}개 필요합니다.`,
        span,
      },
    ])
    this.functionName = functionName
    this.minimumArguments = minimumArguments
    this.actualArguments = actualArguments
  }
}

export class ZslInvalidArgumentTypeError extends ZslValidationError {
  override readonly name = 'ZslInvalidArgumentTypeError'
  override readonly code = 'INVALID_ARGUMENT_TYPE'
  readonly functionName: string
  readonly expectedType: 'string' | 'number' | 'boolean'

  constructor(
    {
      functionName,
      expectedType,
    }: {
      functionName: string
      expectedType: 'string' | 'number' | 'boolean'
    },
    span: SourceSpan,
  ) {
    super([
      {
        kind: 'validation',
        message: `'${functionName}' 함수의 인자는 ${argumentTypeNames[expectedType]} 타입이어야 합니다.`,
        span,
      },
    ])
    this.functionName = functionName
    this.expectedType = expectedType
  }
}

export class ZslInvalidFunctionResultError extends ZslValidationError {
  override readonly name = 'ZslInvalidFunctionResultError'
  override readonly code = 'INVALID_FUNCTION_RESULT'

  constructor(
    readonly functionName: string,
    span: SourceSpan,
  ) {
    super([
      {
        kind: 'validation',
        message: `'${functionName}' 함수의 반환값은 문자열, 불리언, null 또는 유한한 숫자여야 합니다.`,
        span,
      },
    ])
  }
}

export class ZslInvalidConditionTypeError extends ZslValidationError {
  override readonly name = 'ZslInvalidConditionTypeError'
  override readonly code = 'INVALID_CONDITION_TYPE'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'validation',
        message: '삼항 연산자의 조건은 불리언이어야 합니다.',
        span,
      },
    ])
  }
}

export class ZslDivisionByZeroError extends ZslValidationError {
  override readonly name = 'ZslDivisionByZeroError'
  override readonly code = 'DIVISION_BY_ZERO'

  constructor(span: SourceSpan) {
    super([{ kind: 'validation', message: '0으로 나눌 수 없습니다.', span }])
  }
}

export class ZslNonFiniteArithmeticResultError extends ZslValidationError {
  override readonly name = 'ZslNonFiniteArithmeticResultError'
  override readonly code = 'NON_FINITE_ARITHMETIC_RESULT'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'validation',
        message: '산술 연산 결과는 유한한 값이어야 합니다.',
        span,
      },
    ])
  }
}

export class ZslInvalidArithmeticOperandTypeError extends ZslValidationError {
  override readonly name = 'ZslInvalidArithmeticOperandTypeError'
  override readonly code = 'INVALID_ARITHMETIC_OPERAND_TYPE'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'validation',
        message: '산술 연산의 피연산자는 숫자여야 합니다.',
        span,
      },
    ])
  }
}

export class ZslInvalidComparisonOperandTypeError extends ZslValidationError {
  override readonly name = 'ZslInvalidComparisonOperandTypeError'
  override readonly code = 'INVALID_COMPARISON_OPERAND_TYPE'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'validation',
        message: '크기 비교의 피연산자는 숫자여야 합니다.',
        span,
      },
    ])
  }
}

export class ZslInvalidLogicalOperandTypeError extends ZslValidationError {
  override readonly name = 'ZslInvalidLogicalOperandTypeError'
  override readonly code = 'INVALID_LOGICAL_OPERAND_TYPE'

  constructor(span: SourceSpan) {
    super([
      {
        kind: 'validation',
        message: '논리 연산의 피연산자는 불리언이어야 합니다.',
        span,
      },
    ])
  }
}
