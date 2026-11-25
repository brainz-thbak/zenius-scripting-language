import type { LiteralValue, SourceSpan } from '../src/ast/index.js'

export type Context = Readonly<Record<string, unknown>>
export type ParseCase = { name: string; input: string }
export type EvalCase = ParseCase & { expected: LiteralValue }
type SyntaxCase = ParseCase & { span: SourceSpan }

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
const syntax = (name: string, input: string, span: SourceSpan): SyntaxCase => ({
  name,
  input,
  span,
})

export const literalEvaluationCases: EvalCase[] = [
  e('integer literal', '4', 4),
  e('decimal literal', '01.25', 1.25),
  e('single-quoted literal', "'event'", 'event'),
  e('escaped line feed', '"line\\nfeed"', 'line\nfeed'),
  e('true literal', 'true', true),
  e('false literal', 'false', false),
  e('null literal', 'null', null),
  e('empty string', "''", ''),
  e(
    'escaped quotes and backslash',
    String.raw`'it\'s \"ZSL\"\\'`,
    'it\'s "ZSL"\\',
  ),
  e('escaped carriage return and tab', '"\\r\\t"', '\r\t'),
]

export const arithmeticEvaluationCases: EvalCase[] = [
  e('addition', '1 + 2', 3),
  e('subtraction', '7 - 3', 4),
  e('multiplication', '3 * 4', 12),
  e('division', '8 / 2', 4),
  e('precedence', '1 + 2 * 3', 7),
  e('parentheses', '(1 + 2) * 3', 9),
  e('nested parentheses', '((1 + 2) * (3 + 4))', 21),
  e('left-associative subtraction', '8 - 3 - 2', 3),
  e('left-associative division', '8 / 4 / 2', 1),
  e('equal multiplication and division precedence', '24 / 3 * 2', 16),
  e('decimal division', '3 / 2', 1.5),
  e('subtraction below zero', '2 - 5', -3),
  e('whitespace between tokens', '1\t+\r\n2', 3),
  e('grouped string literal', '("event")', 'event'),
]

export const evaluationCases: EvalCase[] = [
  ...literalEvaluationCases,
  ...arithmeticEvaluationCases,
  e('ternary true', 'true ? 1 : 2', 1),
  e('ternary false', 'false ? 1 : 2', 2),
  e('logical and', 'true && false', false),
  e('logical or', 'false || true', true),
  e('null fallback', 'null ?? 10', 10),
  e('zero is not null', '0 ?? 10', 0),
]

export const literalParseRejectCases: SyntaxCase[] = [
  syntax('empty', '', { start: 0, end: 0 }),
  syntax('whitespace only', ' \t\r\n', { start: 4, end: 4 }),
  syntax('adjacent literals', '4 5', { start: 2, end: 3 }),
  syntax('unclosed string', "'event", { start: 0, end: 6 }),
  syntax('unclosed escape', "'event\\", { start: 0, end: 7 }),
  syntax('unsupported string escape', "'\\q'", { start: 1, end: 3 }),
  syntax('missing integer part', '.5', { start: 0, end: 1 }),
  syntax('missing fractional part', '4.', { start: 1, end: 2 }),
]

export const arithmeticParseRejectCases: SyntaxCase[] = [
  syntax('unclosed group', '(1 + 2', { start: 6, end: 6 }),
  syntax('missing operand', '1 +', { start: 3, end: 3 }),
  syntax('empty group', '()', { start: 1, end: 2 }),
  syntax('operator in place of an operand', '1 + * 2', { start: 4, end: 5 }),
  syntax('unmatched closing parenthesis', '1 + 2)', { start: 5, end: 6 }),
  syntax('adjacent literals in a group', '(1 2)', { start: 3, end: 4 }),
]

export const parseRejectCases: ParseCase[] = [
  ...literalParseRejectCases,
  ...arithmeticParseRejectCases,
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
