interface IntegerLayout {
  readonly digits: string
  readonly grouped: boolean
}

export interface DecimalLayout {
  readonly integer: IntegerLayout
  readonly fraction: string | undefined
}

type FractionDenominator =
  | { readonly kind: 'fixed'; readonly value: bigint }
  | { readonly kind: 'variable'; readonly digits: string }

export type NumberFormat =
  | { readonly kind: 'general' }
  | ({
      readonly scale: number
      readonly percent: string
    } & (
      | { readonly kind: 'fixed'; readonly layout: DecimalLayout }
      | {
          readonly kind: 'scientific'
          readonly layout: DecimalLayout
          readonly showPositiveSign: boolean
          readonly exponent: string
        }
      | {
          readonly kind: 'fraction'
          readonly whole: IntegerLayout | undefined
          readonly numerator: string
          readonly denominator: FractionDenominator
        }
    ))

const wholePattern = /^([0#?]+(?:,[0#?]+)*)(,*)$/
const decimalPattern =
  /^([0#?,]*)(?:\.((?:[0#?]+,*)?))?(?:E([+-])([0#?]+))?(%*)$/
const fractionPattern =
  /^(?:([0#?,]+) )?([0#?]+)\/(?:([0#?]+)|([1-9][0-9]*))(%*)$/

export function parseNumberFormat(pattern: string): NumberFormat | undefined {
  if (pattern.length > 255) {
    return undefined
  }
  if (pattern.toLowerCase() === 'general') {
    return { kind: 'general' }
  }

  const fraction = fractionPattern.exec(pattern)
  if (fraction !== null) {
    const [, whole, numerator, digits, fixedDenominator, percent] = fraction
    const integer = parseInteger(whole ?? '')
    if (integer === undefined) {
      return undefined
    }
    return {
      kind: 'fraction',
      whole: whole === undefined ? undefined : integer.layout,
      numerator,
      denominator:
        fixedDenominator === undefined
          ? { kind: 'variable', digits }
          : { kind: 'fixed', value: BigInt(fixedDenominator) },
      scale: integer.scale - 2 * percent.length,
      percent,
    }
  }

  const decimal = decimalPattern.exec(pattern)
  if (decimal === null) {
    return undefined
  }
  const [, whole, decimalPlaces, sign, exponent, percent] = decimal
  const integer = parseInteger(whole)
  const places = decimalPlaces?.replace(/,+$/, '')
  if (integer === undefined || (whole === '' && !places)) {
    return undefined
  }
  const trailingCommas = (decimalPlaces?.length ?? 0) - (places?.length ?? 0)
  const scale = integer.scale + 3 * trailingCommas - 2 * percent.length
  const layout = { integer: integer.layout, fraction: places }
  return exponent === undefined
    ? { kind: 'fixed', layout, scale, percent }
    : {
        kind: 'scientific',
        layout,
        showPositiveSign: sign === '+',
        exponent,
        scale,
        percent,
      }
}

function parseInteger(
  text: string,
): { layout: IntegerLayout; scale: number } | undefined {
  if (text === '') {
    return { layout: { digits: '', grouped: false }, scale: 0 }
  }
  const match = wholePattern.exec(text)
  if (match === null) {
    return undefined
  }
  const [, groupedDigits, commas] = match
  return {
    layout: {
      digits: groupedDigits.replaceAll(',', ''),
      grouped: groupedDigits.includes(','),
    },
    scale: 3 * commas.length,
  }
}
