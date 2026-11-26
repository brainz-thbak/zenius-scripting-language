import { describe, expect, it } from 'vitest'
import { Expression, ZSL, ZslValidationError } from '../src/zsl/index.js'

const zsl = new ZSL()

describe('ZSL templates', () => {
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

  it('evaluates only the selected branch and required operands in each segment', () => {
    const expression = zsl.compile(
      '${true ? 4 : 1 / 0} ${false && (1 / 0)} ${true || (1 / 0)} ${5 ?? (1 / 0)}',
    )

    expect(expression.evaluate()).toBe('4 false true 5')
  })

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
    expect(() => zsl.compile(source)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [expect.objectContaining({ kind, span })],
      }),
    )
  })

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
    expect(() => zsl.compile(source)).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
        issues: [{ kind: 'syntax', message, span }],
      }),
    )
  })

  it('reports an absolute runtime issue and can still evaluate with another context', () => {
    const source = "🌐 ${1}\n${8 / GET('event', 'severity')}"
    const expression = zsl.compile(source)

    expect(() => expression.evaluate({ event: { severity: 0 } })).toThrow(
      expect.objectContaining({
        constructor: ZslValidationError,
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
})
