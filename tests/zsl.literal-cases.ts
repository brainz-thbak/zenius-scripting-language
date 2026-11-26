import type { LiteralValue } from '../src/ast/index.js'

// 파서와 평가기가 같은 원문을 동일한 리터럴 값으로 해석하는지 이 표를 공유해 확인한다.
// 문자열 사례에는 따옴표와 이스케이프가 들어 있는 원문과 디코딩한 값을 함께 둔다.
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
