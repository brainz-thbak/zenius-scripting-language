export interface Decimal {
  readonly coefficient: bigint
  readonly scale: number
}

export function readDecimal(text: string): Decimal {
  const [mantissa, exponent = '0'] = text.toLowerCase().split('e')
  const dot = mantissa.indexOf('.')
  return {
    coefficient: BigInt(mantissa.replace('.', '')),
    scale: (dot === -1 ? 0 : mantissa.length - dot - 1) - Number(exponent),
  }
}

export function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent)
}

export function roundRatio(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator)
}

export function roundDecimal(value: Decimal, scale: number): bigint {
  const shift = scale - value.scale
  if (shift >= 0) {
    return value.coefficient * powerOfTen(shift)
  }
  return roundRatio(value.coefficient, powerOfTen(-shift))
}

export function splitDigits(
  coefficient: bigint,
  scale: number,
): [integer: string, fraction: string] {
  const digits = coefficient.toString()
  if (scale <= 0) {
    return [digits + '0'.repeat(-scale), '']
  }
  const padded = digits.padStart(scale + 1, '0')
  return [padded.slice(0, -scale), padded.slice(-scale)]
}

export function closestFraction(
  numerator: bigint,
  denominator: bigint,
  limit: bigint,
  roundToIntegerWithoutFractionalConvergent: boolean,
): [numerator: bigint, denominator: bigint] {
  let [remainder, divisor] = [numerator, denominator]
  let [previousNumerator, previousDenominator] = [0n, 1n]
  let [convergentNumerator, convergentDenominator] = [1n, 0n]

  while (divisor !== 0n) {
    const quotient = remainder / divisor
    const nextDenominator =
      previousDenominator + quotient * convergentDenominator
    if (nextDenominator > limit) {
      if (
        roundToIntegerWithoutFractionalConvergent &&
        convergentDenominator === 1n
      ) {
        return [roundRatio(numerator, denominator), 1n]
      }
      const steps = (limit - previousDenominator) / convergentDenominator
      const candidateNumerator = previousNumerator + steps * convergentNumerator
      const candidateDenominator =
        previousDenominator + steps * convergentDenominator
      const convergentError =
        abs(
          numerator * convergentDenominator - denominator * convergentNumerator,
        ) * candidateDenominator
      const candidateError =
        abs(
          numerator * candidateDenominator - denominator * candidateNumerator,
        ) * convergentDenominator
      if (
        convergentError < candidateError ||
        (convergentError === candidateError &&
          convergentNumerator * candidateDenominator >
            candidateNumerator * convergentDenominator)
      ) {
        return [convergentNumerator, convergentDenominator]
      }
      return [candidateNumerator, candidateDenominator]
    }
    const nextNumerator = previousNumerator + quotient * convergentNumerator
    previousNumerator = convergentNumerator
    previousDenominator = convergentDenominator
    convergentNumerator = nextNumerator
    convergentDenominator = nextDenominator
    const nextRemainder = remainder % divisor
    remainder = divisor
    divisor = nextRemainder
  }
  return [convergentNumerator, convergentDenominator]
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value
}
