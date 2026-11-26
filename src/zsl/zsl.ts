import {
  ZslInputLengthLimitExceededError,
  ZslInvalidSourceTypeError,
} from '../exception/index.js'
import { Expression } from '../expression/index.js'
import { compileTemplate } from '../template/template.js'
import type { ZslOptions } from './types.js'

const DEFAULT_MAX_INPUT_LENGTH = 16_384
const DEFAULT_MAX_OUTPUT_LENGTH = 65_536

export class ZSL {
  readonly maxInputLength?: number | undefined
  readonly maxOutputLength?: number | undefined

  constructor(options?: ZslOptions) {
    this.compile = this.compile.bind(this)
    if (
      options !== undefined &&
      (typeof options !== 'object' ||
        options === null ||
        Array.isArray(options))
    ) {
      throw new TypeError('ZSL options must be an object')
    }

    this.maxInputLength =
      readLengthLimit('maxInputLength', options?.maxInputLength) ??
      DEFAULT_MAX_INPUT_LENGTH
    this.maxOutputLength =
      readLengthLimit('maxOutputLength', options?.maxOutputLength) ??
      DEFAULT_MAX_OUTPUT_LENGTH
  }

  compile(source: string): Expression {
    if (typeof source !== 'string') {
      throw new ZslInvalidSourceTypeError()
    }
    const maxInputLength = this.maxInputLength
    if (maxInputLength !== undefined && source.length > maxInputLength) {
      throw new ZslInputLengthLimitExceededError(maxInputLength)
    }
    return new Expression(compileTemplate(source), this.maxOutputLength)
  }
}

function readLengthLimit(
  option: keyof ZslOptions,
  value: unknown,
): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${option} must be a nonnegative safe integer`)
  }
  return value
}
