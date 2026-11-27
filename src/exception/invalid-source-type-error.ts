import { ZslError } from './zsl-error.js'

export class ZslInvalidSourceTypeError extends ZslError<never> {
  override readonly name = 'ZslInvalidSourceTypeError'
  override readonly code = 'INVALID_SOURCE_TYPE'

  constructor() {
    super('템플릿 원문은 문자열이어야 합니다.', [])
  }
}
