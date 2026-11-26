import assert from 'node:assert/strict'
import { describe, expect, it } from 'vitest'
import { Expression } from '../src/expression/index.js'
import {
  ZSL,
  ZslSyntaxError,
  ZslUnexpectedCharacterError,
  ZslValidationError,
} from '../src/zsl/index.js'

const zsl = new ZSL()

describe('ZSL templates', () => {
  // 일반 텍스트와 공백은 보존하고 표현식 구간의 결과를 원래 순서대로 끼워 넣는다.
  // 따옴표와 이스케이프가 있는 문자열 안의 중괄호도 구간 끝과 구별한다.
  it.each([
    { source: '', expected: '' },
    { source: '4 + 6', expected: '4 + 6' },
    { source: '{event.name}', expected: '{event.name}' },
    { source: ' } { $ \\ ', expected: ' } { $ \\ ' },
    { source: '${4 + 6}', expected: '10' },
    { source: '4 + 6 = ${4 + 6}', expected: '4 + 6 = 10' },
    { source: '{${1}${2}} tail', expected: '{12} tail' },
    { source: '${null}/${true}/${false}/${""}', expected: 'null/true/false/' },
    { source: "${'}'}", expected: '}' },
    { source: '${"}"}', expected: '}' },
    { source: "${'it\\'}s'}", expected: "it'}s" },
    { source: '${"a\\"}b"}', expected: 'a"}b' },
    { source: "${'\\\\'}tail", expected: '\\tail' },
    { source: "\\${'${value}'}", expected: '\\${value}' },
    { source: ' \r\n${\r\n\t4 + 6\n}\r\t ', expected: ' \r\n10\r\t ' },
  ])('evaluates "$source"', ({ source, expected }) => {
    const expression = zsl.compile(source)

    expect(expression.evaluate()).toBe(expected)
  })

  it('preserves the difference between adjacent large numeric literals', () => {
    const expression = zsl.compile('${9007199254740992},${9007199254740993}')

    expect(expression.evaluate()).toBe('9007199254740992,9007199254740993')
  })

  it('round-trips a small decimal evaluation result as a numeric literal', () => {
    const result = zsl.compile('${0.0000001}').evaluate()
    const source = `\${${result}}`

    expect(zsl.compile(source).evaluate()).toBe(result)
  })

  // 한 번 컴파일한 템플릿을 여러 이벤트에 재사용한다.
  // 평가할 때마다 전달한 이벤트 값을 읽으며, 컨텍스트가 없을 때는 null을 문자열로 표시한다.
  it('evaluates the same template with each supplied context', () => {
    const expression = zsl.compile(
      "${GET('event', 'name')}의 위험도는 ${GET('event', 'severity')}입니다.",
    )

    expect(
      expression.evaluate({ event: { name: '로그인', severity: 6 } }),
    ).toBe('로그인의 위험도는 6입니다.')
    expect(
      expression.evaluate({ event: { name: '로그아웃', severity: 9 } }),
    ).toBe('로그아웃의 위험도는 9입니다.')
    expect(expression.evaluate()).toBe('null의 위험도는 null입니다.')
  })

  it('looks up a canonically equivalent Unicode property name', () => {
    const expression = zsl.compile("${GET('event', '가')}")
    const decomposedKey = '가'.normalize('NFD')

    expect(expression.evaluate({ event: { [decomposedKey]: '완료' } })).toBe(
      '완료',
    )
  })

  // 선택되지 않는 분기와 단락되는 오른쪽 항에 0으로 나누는 식을 둔다.
  // 각 구간은 필요한 값만 평가하고 그 결과를 차례로 출력한다.
  it('evaluates only the selected branch and required operands in each segment', () => {
    const expression = zsl.compile(
      '${true ? 4 : 1 / 0} ${false && (1 / 0)} ${true || (1 / 0)} ${5 ?? (1 / 0)}',
    )

    expect(expression.evaluate()).toBe('4 false true 5')
  })

  // 구간을 읽거나 표현식을 파싱할 때의 문법 오류와 함수 검사 오류를 구분한다.
  // 일반 텍스트, 앞 구간, 이모지, 줄바꿈을 포함한 템플릿 전체에서 진단 위치를 잰다.
  it.each([
    { source: '결과: ${4 + 6', kind: 'syntax', span: { start: 4, end: 11 } },
    { source: '${event.name}', kind: 'syntax', span: { start: 7, end: 8 } },
    { source: '${}', kind: 'syntax', span: { start: 2, end: 2 } },
    { source: '${ \n\t}', kind: 'syntax', span: { start: 5, end: 5 } },
    { source: '${1 2}', kind: 'syntax', span: { start: 4, end: 5 } },
    { source: '${${1}}', kind: 'syntax', span: { start: 2, end: 3 } },
    { source: '${"\\}"}', kind: 'syntax', span: { start: 3, end: 5 } },
    {
      source: '🌐 ${1}\n${"x}',
      kind: 'syntax',
      span: { start: 8, end: 13 },
    },
    {
      source: '🌐 ${1}\n${1 +\n',
      kind: 'syntax',
      span: { start: 8, end: 14 },
    },
    {
      source: '🌐 ${1}\n${4 + 😀}',
      kind: 'syntax',
      span: { start: 14, end: 16 },
    },
    {
      source: '🌐 ${1}\n${4 + }',
      kind: 'syntax',
      span: { start: 14, end: 14 },
    },
    {
      source: '🌐 ${1}\n${true ? 4 : nope()}',
      kind: 'validation',
      span: { start: 21, end: 27 },
    },
  ])('reports a $kind issue for "$source"', ({ source, kind, span }) => {
    const compile = () => zsl.compile(source)
    expect(compile).toThrow(
      kind === 'syntax' ? ZslSyntaxError : ZslValidationError,
    )
    expect(compile).toThrow(
      expect.objectContaining({
        issues: [expect.objectContaining({ kind, span })],
      }),
    )
  })

  it('reports the full Unicode grapheme in a composite emoji syntax error', () => {
    const source = '알림 🌐 ${4 + 👩🏽‍💻}'

    assert.throws(
      () => zsl.compile(source),
      (error: unknown) => {
        assert(error instanceof ZslUnexpectedCharacterError)
        const [issue] = error.issues
        assert(issue)
        const { start, end } = issue.span
        expect(source.slice(start, end)).toBe('👩🏽‍💻')
        return true
      },
    )
  })

  // 닫힌 구간을 파싱할 때는 지원하지 않는 이스케이프 위치를 보고한다.
  // 구간 자체가 닫히지 않으면 구간 탐색 오류를 먼저 보고한다.
  it.each([
    {
      source: '${"\\q"}',
      message: 'Unsupported escape sequence',
      span: { start: 3, end: 5 },
    },
    {
      source: '${"\\q"',
      message: 'Unterminated template expression',
      span: { start: 0, end: 6 },
    },
  ])('reports $message for "$source"', ({ source, message, span }) => {
    const compile = () => zsl.compile(source)
    expect(compile).toThrow(ZslSyntaxError)
    expect(compile).toThrow(
      expect.objectContaining({
        issues: [{ kind: 'syntax', message, span }],
      }),
    )
  })

  // 컨텍스트가 0을 제공하면 제수에 해당하는 표현식 범위를 템플릿 전체 기준으로 보고한다.
  // 같은 컴파일 결과를 유효한 컨텍스트로 다시 평가하면 정상 출력이 나온다.
  it('reports an absolute runtime issue and can still evaluate with another context', () => {
    const source = "🌐 ${1}\n${8 / GET('event', 'severity')}"
    const expression = zsl.compile(source)

    const evaluate = () => expression.evaluate({ event: { severity: 0 } })
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start: 14, end: 38 },
          }),
        ],
      }),
    )
    expect(expression.evaluate({ event: { severity: 2 } })).toBe('🌐 1\n4')
  })

  // 텍스트 구간과 리터럴 표현식으로 템플릿 AST를 직접 구성한다.
  // 생성자가 받은 순서대로 평가하고 표현식 결과를 문자열로 붙인다.
  it('evaluates a template AST supplied to the Expression constructor', () => {
    const expression = new Expression([
      { kind: 'text', value: 'value=' },
      {
        kind: 'expression',
        expression: {
          kind: 'literal',
          value: true,
          span: { start: 8, end: 12 },
        },
      },
    ])

    expect(expression.evaluate()).toBe('value=true')
  })

  // AST 스냅샷에서 중첩 호출의 인자 값과 그 소스 범위를 수정한다.
  // 원본의 평가 결과와 다시 얻은 스냅샷에는 원래 값과 범위가 유지된다.
  it('isolates nested snapshot nodes and source ranges from evaluation', () => {
    const source = "${true ? GET('event', 'severity') + 1 : 0}"
    const expression = zsl.compile(source)
    const expected = zsl.compile(source).getAstSnapshot()
    const [part] = expression.getAstSnapshot()
    assert(
      part?.kind === 'expression' && part.expression.kind === 'conditional',
      'Expected a conditional expression',
    )
    const branch = part.expression.whenTrue
    assert(
      branch.kind === 'binary' && branch.left.kind === 'call',
      'Expected a function call inside the true branch',
    )
    const key = branch.left.args[1]
    assert(key?.kind === 'literal', 'Expected a literal property name')

    Reflect.set(key, 'value', 'missing')
    Reflect.set(key.span, 'start', 0)

    expect(expression.evaluate({ event: { severity: 6 } })).toBe('7')
    expect(expression.getAstSnapshot()).toEqual(expected)
  })

  // 생성자에 전달했던 배열과 그 안의 텍스트를 스냅샷을 얻은 뒤 수정한다.
  // 앞서 얻은 스냅샷에는 캡처 시점의 배열 구조와 텍스트가 남는다.
  it('lets the caller change its input after taking a snapshot', () => {
    const part = { kind: 'text' as const, value: 'original' }
    const parts = [part]
    const expression = new Expression(parts)
    const snapshot = expression.getAstSnapshot()

    parts.push({ kind: 'text', value: ' extra' })
    part.value = 'changed'

    expect(snapshot).toEqual([{ kind: 'text', value: 'original' }])
  })

  // 왼쪽으로 깊은 덧셈 AST의 스냅샷을 새 Expression에 전달한다.
  // 복사한 AST도 20,000개 연산을 모두 포함하며 평가 결과는 원문의 합과 같다.
  it('copies deeply nested expressions at the supported evaluation depth', () => {
    const additions = 20_000
    const source = `\${${'1+'.repeat(additions)}1}`
    const snapshot = zsl.compile(source).getAstSnapshot()

    expect(new Expression(snapshot).evaluate()).toBe(String(additions + 1))
  })
})
