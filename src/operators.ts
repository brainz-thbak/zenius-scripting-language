const arithmeticPrecedence = {
  '+': 6,
  '-': 6,
  '*': 7,
  '/': 7,
}

const equalityPrecedence = {
  '==': 4,
  '!=': 4,
}

const orderingPrecedence = {
  '<': 5,
  '<=': 5,
  '>': 5,
  '>=': 5,
}

export const binaryOperatorPrecedence = Object.freeze({
  '??': 1,
  '||': 2,
  '&&': 3,
  ...equalityPrecedence,
  ...orderingPrecedence,
  ...arithmeticPrecedence,
})

export type ArithmeticOperator = keyof typeof arithmeticPrecedence
export type EqualityOperator = keyof typeof equalityPrecedence
export type OrderingOperator = keyof typeof orderingPrecedence
export type BinaryOperator = keyof typeof binaryOperatorPrecedence

export const maxBinaryOperatorLength = Math.max(
  ...Object.keys(binaryOperatorPrecedence).map((operator) => operator.length),
)

export function isBinaryOperator(spelling: string): spelling is BinaryOperator {
  return Object.hasOwn(binaryOperatorPrecedence, spelling)
}
