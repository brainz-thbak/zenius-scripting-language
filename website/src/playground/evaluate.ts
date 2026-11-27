import { type Expression, ZSL, ZslError, type ZslIssue } from '@zenius/zsl'

type ParsedContext =
  | { kind: 'valid'; value: Record<string, unknown> }
  | { kind: 'invalid'; message: string }

type RunResult =
  | { kind: 'success'; output: string; expression: Expression }
  | {
      kind: 'error'
      code: string
      message: string
      issues: readonly ZslIssue[]
    }

const zsl = new ZSL()

export function parseContext(source: string): ParsedContext {
  if (!source.trim()) return { kind: 'valid', value: {} }

  try {
    const value: unknown = JSON.parse(source)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        kind: 'invalid',
        message: '컨텍스트에는 JSON 객체를 입력하세요.',
      }
    }
    return { kind: 'valid', value: Object.fromEntries(Object.entries(value)) }
  } catch {
    return { kind: 'invalid', message: '컨텍스트의 JSON 문법을 확인하세요.' }
  }
}

export function evaluate(source: string, context: ParsedContext): RunResult {
  if (context.kind === 'invalid') {
    return {
      kind: 'error',
      code: 'INVALID_JSON_CONTEXT',
      message: context.message,
      issues: [],
    }
  }

  try {
    const expression = zsl.compile(source)
    const output = expression.evaluate(context.value)
    return { kind: 'success', output, expression }
  } catch (error) {
    if (error instanceof ZslError) {
      return {
        kind: 'error',
        code: error.code,
        message: error.message,
        issues: error.issues,
      }
    }
    return {
      kind: 'error',
      code: 'EVALUATION_ERROR',
      message:
        error instanceof Error
          ? error.message
          : '템플릿을 실행하는 중 오류가 발생했습니다.',
      issues: [],
    }
  }
}

export function formatAst(expression: Expression): string | null {
  try {
    const ast = expression.getAstSnapshot()
    const stringifyBigInt = (_key: string, value: unknown) =>
      typeof value === 'bigint' ? { $bigint: value.toString() } : value
    const compact = JSON.stringify(ast, stringifyBigInt)
    return compact.length <= 32_768
      ? JSON.stringify(ast, stringifyBigInt, 2)
      : compact
  } catch {
    return null
  }
}
