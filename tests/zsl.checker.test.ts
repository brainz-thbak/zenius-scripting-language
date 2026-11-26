import { describe, expect, it } from 'vitest'
import { checkExpression } from '../src/checker/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'

describe('checkExpression', () => {
  // 호출 구문은 파싱한 뒤 함수 이름과 최소 인자 수를 검사한다.
  // 허용 목록 밖의 이름과 인자가 부족한 호출은 호출 전체를 검사 오류로 표시한다.
  it.each([
    { name: 'unknown function', input: 'unknown()' },
    { name: 'wrong case', input: "get('event', 'severity')" },
    { name: 'Object constructor', input: 'constructor()' },
    { name: 'Object method', input: 'toString()' },
    { name: 'Object prototype property', input: '__proto__()' },
    { name: 'fetch', input: 'fetch("/")' },
    { name: 'XHR', input: 'XMLHttpRequest()' },
    { name: 'dayjs', input: 'dayjs()' },
    { name: 'GET without arguments', input: 'GET()' },
    { name: 'GET with one argument', input: "GET('event')" },
  ])('rejects $name after parsing', ({ input }) => {
    const ast = parseExpression(input)
    const check = () => checkExpression(ast)
    expect(check).toThrow(ZslValidationError)
    expect(check).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start: 0, end: input.length },
          }),
        ],
      }),
    )
  })

  // 검사기는 단락 평가나 삼항 분기가 건너뛸 호출도 확인한다.
  // 여러 오류가 있으면 원문에서 먼저 시작하는 호출의 범위를 보고한다.
  it.each([
    { input: 'true || missing()', first: 'missing()' },
    { input: 'false && missing()', first: 'missing()' },
    { input: '1 ?? missing()', first: 'missing()' },
    { input: 'true ? 1 : missing()', first: 'missing()' },
    { input: 'false ? missing() : 1', first: 'missing()' },
    { input: 'first() + second()', first: 'first()' },
    { input: 'first() ? second() : third()', first: 'first()' },
    { input: 'true ? first() : second()', first: 'first()' },
    { input: 'GET(first(), second())', first: 'first()' },
    { input: 'first(second())', first: 'first(second())' },
    { input: "GET('event') + missing()", first: "GET('event')" },
  ])('checks calls in source order in $input', ({ input, first }) => {
    const ast = parseExpression(input)
    const start = input.indexOf(first)
    const check = () => checkExpression(ast)
    expect(check).toThrow(ZslValidationError)
    expect(check).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + first.length },
          }),
        ],
      }),
    )
  })

  // 안쪽 호출이 바깥 호출의 인자인 구조를 20,000단계 중첩한다.
  // 함수 이름과 인자 수가 유효하면 이 깊이에서도 검사를 마칠 수 있어야 한다.
  it('checks 20,000 nested GET calls', () => {
    const depth = 20_000
    const input = `${"GET('event', ".repeat(depth)}'key'${')'.repeat(depth)}`

    expect(() => checkExpression(parseExpression(input))).not.toThrow()
  })
})
