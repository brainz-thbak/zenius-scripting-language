import { ZslError } from './zsl-error.js'

export class ZslInputLengthLimitExceededError extends ZslError<never> {
  override readonly name = 'ZslInputLengthLimitExceededError'
  override readonly code = 'INPUT_LENGTH_LIMIT_EXCEEDED'

  constructor(readonly limit: number) {
    super(
      `ZSL template source exceeds the maximum input length of ${limit}`,
      [],
    )
  }
}

export class ZslOutputLengthLimitExceededError extends ZslError<never> {
  override readonly name = 'ZslOutputLengthLimitExceededError'
  override readonly code = 'OUTPUT_LENGTH_LIMIT_EXCEEDED'

  constructor(readonly limit: number) {
    super(
      `Rendered ZSL template exceeds the maximum output length of ${limit}`,
      [],
    )
  }
}
