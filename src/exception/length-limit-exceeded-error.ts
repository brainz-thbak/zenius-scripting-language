import { ZslError } from './zsl-error.js'

export class ZslInputLengthLimitExceededError extends ZslError<never> {
  override readonly name = 'ZslInputLengthLimitExceededError'
  override readonly code = 'INPUT_LENGTH_LIMIT_EXCEEDED'

  constructor(readonly limit: number) {
    super(
      `템플릿 원문의 길이가 최대 ${limit} UTF-16 코드 단위를 초과했습니다.`,
      [],
    )
  }
}

export class ZslOutputLengthLimitExceededError extends ZslError<never> {
  override readonly name = 'ZslOutputLengthLimitExceededError'
  override readonly code = 'OUTPUT_LENGTH_LIMIT_EXCEEDED'

  constructor(readonly limit: number) {
    super(
      `평가 결과의 길이가 최대 ${limit} UTF-16 코드 단위를 초과했습니다.`,
      [],
    )
  }
}
