import { describe, expect, it } from 'vitest'
import { checkExpression } from '../src/checker/index.js'
import { ZslValidationError } from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'

describe('checkExpression', () => {
  // 파싱할 수 있는 호출이라도 인자가 부족하면 호출 전체를 검사 오류로 표시한다.
  it.each([
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

  it('reports insufficient arguments for the entire EXIST call', () => {
    const input = "EXIST('event')"
    const ast = parseExpression(input)

    expect(() => checkExpression(ast)).toThrow(
      expect.objectContaining({
        code: 'INSUFFICIENT_ARGUMENTS',
        functionName: 'EXIST',
        minimumArguments: 2,
        actualArguments: 1,
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
    { input: 'true || GET()', first: 'GET()' },
    { input: 'false && GET()', first: 'GET()' },
    { input: '1 ?? GET()', first: 'GET()' },
    { input: 'true ? 1 : GET()', first: 'GET()' },
    { input: 'false ? GET() : 1', first: 'GET()' },
    { input: 'GET() + EXIST()', first: 'GET()' },
    { input: 'GET() ? EXIST() : 1', first: 'GET()' },
    { input: 'true ? GET() : EXIST()', first: 'GET()' },
    { input: 'GET(EXIST(), GET())', first: 'EXIST()' },
    { input: 'GET(EXIST())', first: 'GET(EXIST())' },
    { input: "GET('event') + EXIST()", first: "GET('event')" },
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
