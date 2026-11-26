import { ZslError } from './zsl-error.js'

export class ZslInvalidSourceTypeError extends ZslError<never> {
  override readonly name = 'ZslInvalidSourceTypeError'
  override readonly code = 'INVALID_SOURCE_TYPE'

  constructor() {
    super('ZSL template source must be a string', [])
  }
}
