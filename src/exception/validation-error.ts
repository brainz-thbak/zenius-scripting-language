import type { SourceSpan } from '../ast/index.js'
import type { ZslIssue } from './types.js'
import { ZslError } from './zsl-error.js'

export class ZslValidationError extends ZslError<ZslIssue<'validation'>> {
  override readonly name: string = 'ZslValidationError'
  override readonly code: string = 'VALIDATION_ERROR'

  constructor(issues: readonly ZslIssue<'validation'>[]) {
    super('ZSL validation failed', issues)
  }
}

export class ZslUnknownFunctionError extends ZslValidationError {
  override readonly name = 'ZslUnknownFunctionError'
  override readonly code = 'UNKNOWN_FUNCTION'

  constructor(
    readonly functionName: string,
    span: SourceSpan,
  ) {
    super([
      {
        kind: 'validation',
        message: `Unknown function '${functionName}'`,
        span,
      },
    ])
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
        message: `'${functionName}' requires at least ${minimumArguments} arguments`,
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
        message: `${functionName} arguments must be ${expectedType}s`,
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
        message: `${functionName} result must be a string, a boolean, null, or a finite number`,
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
        message: 'Conditional condition must be a boolean',
        span,
      },
    ])
  }
}

export class ZslDivisionByZeroError extends ZslValidationError {
  override readonly name = 'ZslDivisionByZeroError'
  override readonly code = 'DIVISION_BY_ZERO'

  constructor(span: SourceSpan) {
    super([{ kind: 'validation', message: 'Division by zero', span }])
  }
}

export class ZslNonFiniteArithmeticResultError extends ZslValidationError {
  override readonly name = 'ZslNonFiniteArithmeticResultError'
  override readonly code = 'NON_FINITE_ARITHMETIC_RESULT'

  constructor(span: SourceSpan) {
    super([
      { kind: 'validation', message: 'Arithmetic result must be finite', span },
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
        message: 'Arithmetic operands must be numbers',
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
        message: 'Logical operands must be booleans',
        span,
      },
    ])
  }
}
