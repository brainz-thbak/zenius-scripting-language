import { ZslError } from './zsl-error.js'

export class ZslUnsupportedExpressionNodeError extends ZslError<never> {
  override readonly name = 'ZslUnsupportedExpressionNodeError'
  override readonly code = 'UNSUPPORTED_EXPRESSION_NODE'

  constructor() {
    super('지원하지 않는 표현식 노드입니다.', [])
  }
}
