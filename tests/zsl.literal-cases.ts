import type { LiteralValue } from '../src/ast/index.js'

export const literalCases = [
  { name: 'integer literal', input: '4', expected: 4 },
  { name: 'decimal literal', input: '01.25', expected: 1.25 },
  { name: 'single-quoted literal', input: "'event'", expected: 'event' },
  { name: 'escaped line feed', input: '"line\\nfeed"', expected: 'line\nfeed' },
  { name: 'true literal', input: 'true', expected: true },
  { name: 'false literal', input: 'false', expected: false },
  { name: 'null literal', input: 'null', expected: null },
  { name: 'empty string', input: "''", expected: '' },
  {
    name: 'escaped quotes and backslash',
    input: String.raw`'it\'s \"ZSL\"\\'`,
    expected: 'it\'s "ZSL"\\',
  },
  {
    name: 'escaped carriage return and tab',
    input: '"\\r\\t"',
    expected: '\r\t',
  },
] satisfies { name: string; input: string; expected: LiteralValue }[]
