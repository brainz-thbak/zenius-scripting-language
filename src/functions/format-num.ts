import {
  ZslInvalidArgumentTypeError,
  ZslInvalidNumberFormatError,
  ZslUnformattableNumberError,
} from '../exception/index.js'
import type { EvaluateFunction } from './functions.js'
import { readDecimal } from './number-format/decimal.js'
import { parseNumberFormat } from './number-format/parse.js'
import { renderNumberFormat } from './number-format/render.js'

export const formatNum: EvaluateFunction = (args) => {
  const [number, pattern] = args
  const value = number.value
  if (
    typeof value !== 'bigint' &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new ZslInvalidArgumentTypeError(
      { functionName: 'FORMAT_NUM', expectedType: 'number' },
      number.span,
    )
  }
  if (typeof pattern.value !== 'string') {
    throw new ZslInvalidArgumentTypeError(
      { functionName: 'FORMAT_NUM', expectedType: 'string' },
      pattern.span,
    )
  }
  const format = parseNumberFormat(pattern.value)
  if (format === undefined) {
    throw new ZslInvalidNumberFormatError(pattern.span)
  }
  const result = renderNumberFormat(
    readDecimal(value.toString()),
    format,
    typeof value === 'bigint',
  )
  if (typeof value === 'number' && result.length > 255) {
    throw new ZslUnformattableNumberError(number.span)
  }
  return result
}
