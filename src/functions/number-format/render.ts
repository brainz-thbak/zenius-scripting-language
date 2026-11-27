import {
  closestFraction,
  type Decimal,
  powerOfTen,
  roundDecimal,
  roundRatio,
  splitDigits,
} from './decimal.js'
import type { DecimalLayout, NumberFormat } from './parse.js'

export function renderNumberFormat(
  value: Decimal,
  format: NumberFormat,
  exactInteger: boolean,
): string {
  const negative = value.coefficient < 0n
  const coefficient = negative ? -value.coefficient : value.coefficient
  if (format.kind === 'general') {
    return (
      sign(negative, coefficient) +
      renderGeneral({ ...value, coefficient }, exactInteger)
    )
  }

  const scaled = { coefficient, scale: value.scale + format.scale }
  switch (format.kind) {
    case 'fixed': {
      const rounded = roundDecimal(scaled, format.layout.fraction?.length ?? 0)
      return (
        sign(negative, rounded) +
        renderFixed(rounded, format.layout) +
        format.percent
      )
    }
    case 'scientific':
      return renderScientific(scaled, format, negative) + format.percent
    case 'fraction':
      return renderFraction(scaled, format, negative) + format.percent
  }
}

function sign(negative: boolean, amount: bigint): string {
  return negative && amount !== 0n ? '-' : ''
}

function renderFixed(
  coefficient: bigint,
  layout: DecimalLayout,
  scientific = false,
): string {
  const { integer, fraction } = layout
  const [whole, places] = splitDigits(coefficient, fraction?.length ?? 0)
  const digits =
    scientific && coefficient === 0n
      ? '0'.repeat(integer.digits.length)
      : whole === '0'
        ? ''
        : whole
  const left = renderInteger(integer.digits, digits, integer.grouped)
  return fraction === undefined
    ? left
    : `${left}.${renderDecimalPlaces(fraction, places)}`
}

function renderInteger(slots: string, digits: string, grouped = false): string {
  const offset = digits.length - slots.length
  let rendered = ''
  let seenDigit = false
  for (let cursor = Math.min(0, offset); cursor < digits.length; cursor++) {
    const slot = slots[cursor - offset]
    const digit = digits[cursor] ?? (slot === '0' ? '0' : '')
    if (digit === '') {
      rendered += slotPadding(slot)
    } else {
      if (grouped && seenDigit && (digits.length - cursor) % 3 === 0) {
        rendered += ','
      }
      rendered += digit
      seenDigit = true
    }
  }
  return rendered
}

function renderDecimalPlaces(slots: string, digits: string): string {
  const significant = trimFraction(digits).length
  const count = Math.max(significant, slots.lastIndexOf('0') + 1)
  return (
    digits.slice(0, count) + [...slots.slice(count)].map(slotPadding).join('')
  )
}

function slotPadding(slot: string): string {
  return slot === '?' ? ' ' : ''
}

function renderScientific(
  value: Decimal,
  format: Extract<NumberFormat, { kind: 'scientific' }>,
  negative: boolean,
): string {
  const { layout, exponent, showPositiveSign } = format
  const precision = layout.fraction?.length ?? 0
  const width = Math.max(1, layout.integer.digits.length)
  const order =
    value.coefficient === 0n
      ? 0
      : value.coefficient.toString().length - value.scale - 1
  let exponentValue = Math.floor(order / width) * width
  let mantissa = roundDecimal(value, precision - exponentValue)
  if (mantissa >= powerOfTen(width + precision)) {
    exponentValue += width
    mantissa = roundDecimal(value, precision - exponentValue)
  }
  const exponentSign = exponentValue < 0 ? '-' : showPositiveSign ? '+' : ''
  return (
    sign(negative, mantissa) +
    renderFixed(mantissa, layout, true) +
    'E' +
    exponentSign +
    renderInteger(exponent, String(Math.abs(exponentValue)))
  )
}

function renderFraction(
  value: Decimal,
  format: Extract<NumberFormat, { kind: 'fraction' }>,
  negative: boolean,
): string {
  const { whole, numerator, denominator } = format
  const divisor = powerOfTen(Math.max(0, value.scale))
  const dividend = value.coefficient * powerOfTen(Math.max(0, -value.scale))
  let wholeValue = whole === undefined ? 0n : dividend / divisor
  const remainder = dividend - wholeValue * divisor
  let top: bigint
  let bottom: bigint
  if (denominator.kind === 'fixed') {
    bottom = denominator.value
    top = roundRatio(remainder * bottom, divisor)
  } else {
    const limit = powerOfTen(denominator.digits.length) - 1n
    const fraction = closestFraction(
      remainder,
      divisor,
      limit,
      whole !== undefined && wholeValue === 0n,
    )
    top = fraction[0]
    bottom = fraction[1]
  }
  if (whole !== undefined && top >= bottom) {
    wholeValue += top / bottom
    top %= bottom
  }
  const hideFraction =
    whole !== undefined && top === 0n && !numerator.includes('0')
  const integer =
    whole === undefined
      ? ''
      : `${renderInteger(
          whole.digits,
          wholeValue === 0n && !hideFraction ? '' : wholeValue.toString(),
          whole.grouped,
        )} `
  const topText = renderInteger(numerator, hideFraction ? '' : top.toString())
  const bottomDigits = bottom.toString()
  const bottomText =
    denominator.kind === 'fixed'
      ? bottomDigits
      : renderDenominator(denominator.digits, bottomDigits)
  const padding =
    numerator.includes('?') ||
    (denominator.kind === 'variable' && denominator.digits.includes('?'))
  const fraction = hideFraction
    ? topText + (padding ? ' '.repeat(1 + bottomText.length) : '')
    : `${topText}/${bottomText}`
  return sign(negative, wholeValue + top) + integer + fraction
}

function renderDenominator(slots: string, digits: string): string {
  const minimumDigits = [...slots].filter((slot) => slot === '0').length
  const padded = digits.padStart(minimumDigits, '0')
  return padded + [...slots.slice(padded.length)].map(slotPadding).join('')
}

function renderGeneral(value: Decimal, exactInteger: boolean): string {
  if (exactInteger || value.coefficient === 0n) {
    return value.coefficient.toString()
  }
  const order = value.coefficient.toString().length - value.scale - 1
  const [integer, fraction] = splitDigits(value.coefficient, value.scale)
  const decimal = decimalSuffix(fraction)
  if (integer.length + decimal.length <= 11) {
    return integer + decimal
  }
  const precision = Math.max(0, 10 - integer.length)
  const scientificPrecision = 7 - Math.max(2, String(Math.abs(order)).length)
  if (order > 10 || (order < -4 && precision + order < scientificPrecision)) {
    const coefficient = roundDecimal(value, scientificPrecision - order)
    const exponent =
      coefficient >= powerOfTen(scientificPrecision + 1) ? order + 1 : order
    const mantissa = roundDecimal(value, scientificPrecision - exponent)
    const [whole, decimal] = splitDigits(mantissa, scientificPrecision)
    return (
      whole +
      decimalSuffix(decimal) +
      'E' +
      (exponent < 0 ? '-' : '+') +
      String(Math.abs(exponent)).padStart(2, '0')
    )
  }
  const [whole, rounded] = splitDigits(
    roundDecimal(value, precision),
    precision,
  )
  return whole + decimalSuffix(rounded)
}

function decimalSuffix(digits: string): string {
  const trimmed = trimFraction(digits)
  return trimmed === '' ? '' : `.${trimmed}`
}

function trimFraction(digits: string): string {
  return digits.replace(/0+$/, '')
}
