import type { CallAst, LiteralValue, SourceSpan } from '../ast/index.js'
import { validationError } from '../exception/index.js'
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
    throw validationError(`Unknown function '${call.name}'`, call.span)
  }
  if (call.args.length < fn.minimumArguments) {
    throw validationError(
      `'${call.name}' requires at least ${fn.minimumArguments} arguments`,
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
      throw validationError('GET arguments must be strings', arg.span)
    }
    if (value === null || typeof value !== 'object') {
      value = undefined
      continue
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, arg.value)
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
  throw validationError(
    'GET result must be a string, a boolean, null, or a finite number',
    span,
  )
}
