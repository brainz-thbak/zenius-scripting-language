import type { CallAst, LiteralValue, SourceSpan } from '../ast/index.js'
import {
  ZslInsufficientArgumentsError,
  ZslInvalidArgumentTypeError,
  ZslInvalidFunctionResultError,
  ZslUnknownFunctionError,
} from '../exception/index.js'
import type { ZslContext } from '../expression/index.js'

export interface EvaluatedArgument {
  readonly value: LiteralValue
  readonly span: SourceSpan
}

export type EvaluateFunction = (
  args: readonly EvaluatedArgument[],
  context: ZslContext,
  span: SourceSpan,
) => LiteralValue

const functions: ReadonlyMap<
  string,
  { readonly minimumArguments: number; readonly evaluate: EvaluateFunction }
> = new Map([['GET', { minimumArguments: 2, evaluate: get }]])

export function resolveCall(call: CallAst): EvaluateFunction {
  const fn = functions.get(call.name)
  if (fn === undefined) {
    throw new ZslUnknownFunctionError(call.name, call.span)
  }
  if (call.args.length < fn.minimumArguments) {
    throw new ZslInsufficientArgumentsError(
      {
        functionName: call.name,
        minimumArguments: fn.minimumArguments,
        actualArguments: call.args.length,
      },
      call.span,
    )
  }
  return fn.evaluate
}

function get(
  args: readonly EvaluatedArgument[],
  context: ZslContext,
  span: SourceSpan,
): LiteralValue {
  let value: unknown = context
  for (const arg of args) {
    if (typeof arg.value !== 'string') {
      throw new ZslInvalidArgumentTypeError(
        { functionName: 'GET', expectedType: 'string' },
        arg.span,
      )
    }
    if (value === null || typeof value !== 'object') {
      value = undefined
      continue
    }
    const descriptor = findOwnPropertyDescriptor(value, arg.value)
    value =
      descriptor && Object.hasOwn(descriptor, 'value')
        ? descriptor.value
        : undefined
  }
  if (value === undefined || value === null) {
    return null
  }
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value
  }
  throw new ZslInvalidFunctionResultError('GET', span)
}

function findOwnPropertyDescriptor(
  object: object,
  key: string,
): PropertyDescriptor | undefined {
  const exact = Object.getOwnPropertyDescriptor(object, key)
  if (exact !== undefined) {
    return exact
  }

  const normalizedKey = key.normalize('NFC')
  let matchingKey: string | undefined
  for (const ownKey of Object.getOwnPropertyNames(object)) {
    if (ownKey.normalize('NFC') !== normalizedKey) {
      continue
    }
    if (matchingKey !== undefined) {
      return undefined
    }
    matchingKey = ownKey
  }

  return matchingKey === undefined
    ? undefined
    : Object.getOwnPropertyDescriptor(object, matchingKey)
}
