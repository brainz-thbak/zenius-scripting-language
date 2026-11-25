export type Context = Readonly<Record<string, unknown>>
export type ParseCase = { name: string; input: string }
export type EvalCase = ParseCase & { expected: number | boolean }

const p = (name: string, input: string): ParseCase => ({ name, input })
const e = (
  name: string,
  input: string,
  expected: EvalCase['expected'],
): EvalCase => ({
  name,
  input,
  expected,
})

export const evaluationCases: EvalCase[] = [
  e('addition', '1 + 2', 3),
  e('subtraction', '7 - 3', 4),
  e('multiplication', '3 * 4', 12),
  e('division', '8 / 2', 4),
  e('precedence', '1 + 2 * 3', 7),
  e('parentheses', '(1 + 2) * 3', 9),
  e('nested parentheses', '((1 + 2) * (3 + 4))', 21),
  e('ternary true', 'true ? 1 : 2', 1),
  e('ternary false', 'false ? 1 : 2', 2),
  e('logical and', 'true && false', false),
  e('logical or', 'false || true', true),
  e('null fallback', 'null ?? 10', 10),
  e('zero is not null', '0 ?? 10', 0),
]

export const parseRejectCases: ParseCase[] = [
  p('empty', ''),
  p('unclosed group', '(1 + 2'),
  p('missing operand', '1 +'),
  p('incomplete ternary', 'true ? 1'),
  p('multiple expressions', '1; 2'),
  p('assignment', 'a = 1'),
  p('compound assignment', 'a += 1'),
  p('increment', 'a++'),
  p('decrement', '--a'),
  p('const declaration', 'const a = 1'),
  p('let declaration', 'let a = 1'),
  p('var declaration', 'var a = 1'),
  p('function declaration', 'function f() {}'),
  p('if statement', 'if (true) 1'),
  p('for statement', 'for (;;) {}'),
  p('switch statement', 'switch (1) {}'),
  p('while statement', 'while (true) {}'),
  p('with statement', 'with (event) {}'),
  p('dot access', 'event.severity'),
  p('bracket access', 'event["severity"]'),
  p('unknown call', 'unknown()'),
  p('window', 'window'),
  p('document', 'document'),
  p('fetch', 'fetch("/")'),
  p('XHR', 'XMLHttpRequest()'),
  p('Vue', 'Vue'),
  p('dayjs', 'dayjs()'),
]
