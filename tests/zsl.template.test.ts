import assert from 'node:assert/strict'
import { describe, expect, it } from 'vitest'
import { Expression } from '../src/expression/index.js'
import {
  ZSL,
  ZslError,
  ZslSyntaxError,
  ZslUnexpectedCharacterError,
  ZslValidationError,
} from '../src/zsl/index.js'

const zsl = new ZSL()

describe('FORMAT_NUM numeric formatting regressions', () => {
  function formatNumber(value: number, pattern: string): string {
    return zsl
      .compile("${FORMAT_NUM(GET('stats', 'value'), GET('stats', 'pattern'))}")
      .evaluate({ stats: { value, pattern } })
  }

  it.each([
    [0.6125, '?/?', '5/8'],
    [-0.6125, '?/?', '-5/8'],
    [0.99999999, '#/#########', '99999999/100000000'],
  ])(
    'formats %s with %s using decimal fraction rounding',
    (value, pattern, expected) => {
      expect(formatNumber(value, pattern)).toBe(expected)
    },
  )

  it('formats the same large integer as a fraction for number and bigint', () => {
    const fromBigInt = zsl.compile(
      "${FORMAT_NUM(9007199254740993 - 9007197107257345, '?/?')}",
    )

    expect(fromBigInt.evaluate()).toBe('2147483648/1')
    expect(formatNumber(2147483648, '?/?')).toBe('2147483648/1')
  })

  it.each([
    ['number', '1080'],
    ['bigint', '9007199254742073 - 9007199254740993'],
  ])(
    'formats 1080 as a mixed fraction for %s after scaling',
    (_type, value) => {
      const mixedFraction = zsl.compile(`\${FORMAT_NUM(${value}, '#, ?/?')}`)

      expect(mixedFraction.evaluate()).toBe('1 1/9')
    },
  )

  it('accepts the whole-percent pattern', () => {
    expect(formatNumber(1234, '0%')).toBe('123400%')
  })
})

describe('ZSL compile input and length limits', () => {
  it('exposes configured input and output limits on the instance', () => {
    const compiler = new ZSL({ maxInputLength: 7, maxOutputLength: 4 })

    expect(compiler.maxInputLength).toBe(7)
    expect(compiler.maxOutputLength).toBe(4)
    expect(zsl.maxInputLength).toBe(16_384)
    expect(zsl.maxOutputLength).toBe(65_536)
  })

  it('enforces the default input limit at the source boundary', () => {
    const source = 'x'.repeat(16_384)

    expect(zsl.compile(source).evaluate()).toBe(source)
    expect(() => zsl.compile(`${source}x`)).toThrow(
      expect.objectContaining({
        code: 'INPUT_LENGTH_LIMIT_EXCEEDED',
        limit: 16_384,
      }),
    )
  })

  it('enforces the default output limit at the evaluated text boundary', () => {
    const expression = zsl.compile("${GET('event', 'value')}")
    const value = 'x'.repeat(65_536)

    expect(expression.evaluate({ event: { value } })).toBe(value)
    expect(() =>
      expression.evaluate({ event: { value: `${value}x` } }),
    ).toThrow(
      expect.objectContaining({
        code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED',
        limit: 65_536,
      }),
    )
  })

  it('uses the default limit independently for omitted and undefined options', () => {
    const emptyInput = new ZSL({ maxInputLength: 0 })
    const largerOutput = new ZSL({
      maxInputLength: undefined,
      maxOutputLength: 65_537,
    })

    expect(emptyInput.maxInputLength).toBe(0)
    expect(emptyInput.maxOutputLength).toBe(65_536)
    expect(largerOutput.maxInputLength).toBe(16_384)
    expect(largerOutput.maxOutputLength).toBe(65_537)

    const value = 'x'.repeat(65_537)
    const expression = largerOutput.compile("${GET('event', 'value')}")
    expect(expression.evaluate({ event: { value } })).toBe(value)
  })

  it('accepts a compiler adapter without limit properties', () => {
    const compiler: ZSL = { compile: (source) => zsl.compile(source) }

    expect(compiler.compile('${42}').evaluate()).toBe('42')
  })

  it('compiles templates when passed as a callback with default options', () => {
    const compiler = new ZSL()
    const expressions = ['value: ${1}', 'text'].map(compiler.compile)

    expect(expressions.map((expression) => expression.evaluate())).toEqual([
      'value: 1',
      'text',
    ])
  })

  it('applies the instance limits when compile is passed as a callback', () => {
    const compiler = new ZSL({ maxInputLength: 2, maxOutputLength: 1 })

    expect(() => ['abc'].map(compiler.compile)).toThrow(
      expect.objectContaining({ code: 'INPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
    const expressions = ['ab'].map(compiler.compile)
    expect(() =>
      expressions.map((expression) => expression.evaluate()),
    ).toThrow(expect.objectContaining({ code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED' }))
  })

  it.each([null, 42])('rejects non-string source %j', (source) => {
    assert.throws(
      () => Reflect.apply(zsl.compile, zsl, [source]),
      (error: unknown) => {
        expect(error).toBeInstanceOf(ZslError)
        expect(error).toMatchObject({ code: 'INVALID_SOURCE_TYPE', issues: [] })
        return true
      },
    )
  })

  it.each([
    { maxInputLength: 7, maxOutputLength: 4 },
    { maxInputLength: 8, maxOutputLength: 5 },
  ])(
    'returns the full result within $maxInputLength input and $maxOutputLength output code units',
    (options) => {
      expect(new ZSL(options).compile('😀${42}').evaluate()).toBe('😀42')
    },
  )

  it('checks the full source length in UTF-16 code units before parsing', () => {
    const limited = new ZSL({ maxInputLength: 4 })
    const compile = () => limited.compile('😀${1')

    expect(compile).toThrow(
      expect.objectContaining({
        code: 'INPUT_LENGTH_LIMIT_EXCEEDED',
        limit: 4,
      }),
    )
    expect(() => limited.compile('${1')).toThrow(
      expect.objectContaining({ code: 'UNTERMINATED_TEMPLATE_EXPRESSION' }),
    )
  })

  it('checks input and output limits on each side of opener decoding', () => {
    const source = '\\${42}'
    const compiler = new ZSL({ maxInputLength: 6, maxOutputLength: 5 })

    expect(compiler.compile(source).evaluate()).toBe('${42}')
    expect(() => new ZSL({ maxInputLength: 5 }).compile(source)).toThrow(
      expect.objectContaining({ code: 'INPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
  })

  it('checks the combined output length in UTF-16 code units on each evaluation', () => {
    const expression = new ZSL({ maxOutputLength: 3 }).compile(
      "😀${GET('event', 'value')}",
    )

    expect(() => expression.evaluate({ event: { value: 42 } })).toThrow(
      expect.objectContaining({
        code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED',
        limit: 3,
      }),
    )
    expect(expression.evaluate({ event: { value: 1 } })).toBe('😀1')
  })

  it('reports output overflow before evaluating a later expression', () => {
    const expression = new ZSL({ maxOutputLength: 1 }).compile('ab${1 / 0}')

    expect(() => expression.evaluate()).toThrow(
      expect.objectContaining({ code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
  })

  it('keeps each instance and its compiled expressions on their original limits', () => {
    const options = { maxInputLength: 2, maxOutputLength: 1 }
    const strict = new ZSL(options)
    const strictExpression = strict.compile('ab')

    options.maxInputLength = 3
    options.maxOutputLength = 2
    const tolerant = new ZSL(options)

    expect(() => strict.compile('abc')).toThrow(
      expect.objectContaining({ code: 'INPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
    expect(() => tolerant.compile('abc')).not.toThrow()
    expect(() => strictExpression.evaluate()).toThrow(
      expect.objectContaining({ code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
    expect(() => strict.compile('ab').evaluate()).toThrow(
      expect.objectContaining({ code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
    expect(tolerant.compile('ab').evaluate()).toBe('ab')
  })

  it('accepts zero limits for empty input and empty output', () => {
    const emptyOnly = new ZSL({ maxInputLength: 0, maxOutputLength: 0 })

    expect(emptyOnly.compile('').evaluate()).toBe('')
    expect(() => emptyOnly.compile('x')).toThrow(
      expect.objectContaining({ code: 'INPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
    const emptyOutputOnly = new ZSL({ maxOutputLength: 0 })
    expect(emptyOutputOnly.compile('${""}').evaluate()).toBe('')
    expect(() => emptyOutputOnly.compile('x').evaluate()).toThrow(
      expect.objectContaining({ code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED' }),
    )
  })

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '10', null])(
    'rejects invalid limit %s at construction',
    (limit) => {
      expect(() => Reflect.construct(ZSL, [{ maxInputLength: limit }])).toThrow(
        RangeError,
      )
      expect(() =>
        Reflect.construct(ZSL, [{ maxOutputLength: limit }]),
      ).toThrow(RangeError)
    },
  )

  it.each([{ options: null }, { options: 42 }, { options: [] }])(
    'rejects invalid options $options at construction',
    ({ options }) => {
      expect(() => Reflect.construct(ZSL, [options])).toThrow(TypeError)
    },
  )
})

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
    { source: "\\\\${'${value}'}", expected: '\\${value}' },
    { source: ' \r\n${\r\n\t4 + 6\n}\r\t ', expected: ' \r\n10\r\t ' },
  ])('evaluates "$source"', ({ source, expected }) => {
    const expression = zsl.compile(source)

    expect(expression.evaluate()).toBe(expected)
  })

  it.each([
    { source: '예시: \\${42}', expected: '예시: ${42}' },
    { source: '예시: \\\\${42}', expected: '예시: \\42' },
    { source: '\\${42} → ${1 + 2}', expected: '${42} → 3' },
    { source: '\\${42', expected: '${42' },
    { source: '\\\\\\${42}', expected: '\\${42}' },
    { source: '\\\\\\\\${42}', expected: '\\\\42' },
    { source: '\\${${42}}', expected: '${42}' },
    { source: 'a\\\\b\\${42}\\\\c${3}d\\', expected: 'a\\\\b${42}\\\\c3d\\' },
  ])(
    'evaluates template opener escapes in "$source"',
    ({ source, expected }) => {
      expect(zsl.compile(source).evaluate()).toBe(expected)
    },
  )

  it('collects decoded text in AST snapshots and preserves expression spans', () => {
    const expression = zsl.compile('\\${1}\\${2}${3}\\${')

    expect(expression.getAstSnapshot()).toEqual([
      { kind: 'text', value: '${1}${2}' },
      {
        kind: 'expression',
        expression: { kind: 'literal', value: 3, span: { start: 12, end: 13 } },
      },
      { kind: 'text', value: '${' },
    ])
  })

  it('preserves the difference between adjacent large numeric literals', () => {
    const expression = zsl.compile('${9007199254740992},${9007199254740993}')

    expect(expression.evaluate()).toBe('9007199254740992,9007199254740993')
  })

  it('preserves a large integer with leading zeroes', () => {
    const expression = zsl.compile('${0009007199254740993}')

    expect(expression.evaluate()).toBe('9007199254740993')
  })

  it.each([
    { source: '${0.0000001}', expected: '0.0000001' },
    { source: '${0.0000000123456789}', expected: '0.0000000123456789' },
    { source: '${1 / 10000000}', expected: '0.0000001' },
    {
      source: "${GET('event', 'value')}",
      context: { event: { value: 0.0000001 } },
      expected: '0.0000001',
    },
  ])(
    'renders a small decimal in $source without an exponent',
    ({ source, context, expected }) => {
      expect(zsl.compile(source).evaluate(context)).toBe(expected)
    },
  )

  it('round-trips a small decimal evaluation result as a numeric literal', () => {
    const result = zsl.compile('${0.0000001}').evaluate()
    const source = `\${${result}}`

    expect(zsl.compile(source).evaluate()).toBe('0.0000001')
  })

  it('preserves numeric literal types in the AST snapshot', () => {
    const expression = zsl.compile(
      '${9007199254740991}${9007199254740993}${9007199254740993.0}',
    )

    expect(expression.getAstSnapshot()).toMatchObject([
      {
        kind: 'expression',
        expression: { kind: 'literal', value: 9007199254740991 },
      },
      {
        kind: 'expression',
        expression: { kind: 'literal', value: 9007199254740993n },
      },
      {
        kind: 'expression',
        expression: { kind: 'literal', value: 9007199254740992 },
      },
    ])
  })

  it('round-trips the smallest positive number from GET', () => {
    const expression = zsl.compile("${GET('event', 'value')}")
    const result = expression.evaluate({ event: { value: Number.MIN_VALUE } })
    const expected = `0.${'0'.repeat(323)}5`

    expect(result).toBe(expected)
    expect(zsl.compile(`\${${result}}`).evaluate()).toBe(expected)
  })

  it('applies the output limit to the expanded small decimal', () => {
    const compiler = new ZSL({ maxOutputLength: 8 })
    const expression = compiler.compile('${0.0000001}')

    expect(() => expression.evaluate()).toThrow(
      expect.objectContaining({
        code: 'OUTPUT_LENGTH_LIMIT_EXCEEDED',
        limit: 8,
      }),
    )
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

  it('selects a template branch by comparing the event severity', () => {
    const expression = zsl.compile(
      "${GET('event', 'severity') >= 5 ? '주의' : '정상'}",
    )

    expect(expression.evaluate({ event: { severity: 6 } })).toBe('주의')
    expect(expression.evaluate({ event: { severity: 5 } })).toBe('주의')
    expect(expression.evaluate({ event: { severity: 4 } })).toBe('정상')
  })

  it('selects the false branch of an EXIST condition with an empty context', () => {
    const expression = zsl.compile(
      "${EXIST('event', 'severity') ? '있음' : '없음'}",
    )

    expect(expression.evaluate({})).toBe('없음')
  })

  it('reports the missing comparison value at its template source span', () => {
    const expression = zsl.compile("🌐 ${1}\n${GET('event', 'severity') >= 5}")

    assert.throws(
      () => expression.evaluate(),
      (error) => {
        expect(error).toBeInstanceOf(ZslValidationError)
        expect(error).toMatchObject({
          issues: [{ kind: 'validation', span: { start: 10, end: 34 } }],
        })
        return true
      },
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
      source: '🌐 \\${42}\n${4 + 😀}',
      kind: 'syntax',
      span: { start: 16, end: 18 },
    },
    {
      source: '🌐 ${1}\n${4 + }',
      kind: 'syntax',
      span: { start: 14, end: 14 },
    },
    {
      source: '🌐 ${1}\n${true ? 4 : nope()}',
      kind: 'syntax',
      span: { start: 21, end: 25 },
    },
    {
      source: '🌐 ${1}\n${true ? 4 : GET()}',
      kind: 'validation',
      span: { start: 21, end: 26 },
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

  it.each([
    { source: '${42', span: { start: 0, end: 4 } },
    { source: '🌐 \\${42} ${42', span: { start: 10, end: 14 } },
  ])('reports the unterminated opener in "$source"', ({ source, span }) => {
    expect(() => zsl.compile(source)).toThrow(
      expect.objectContaining({
        code: 'UNTERMINATED_TEMPLATE_EXPRESSION',
        issues: [expect.objectContaining({ span })],
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

  it('includes a combining mark in the unexpected character span', () => {
    const source = '앞 ${4 + @\u0301}'

    expect(() => zsl.compile(source)).toThrow(
      expect.objectContaining({
        code: 'UNEXPECTED_CHARACTER',
        issues: [expect.objectContaining({ span: { start: 8, end: 10 } })],
      }),
    )
  })

  it('includes the leading digit in an unexpected keycap emoji span', () => {
    const source = '${1️⃣}'

    expect(() => zsl.compile(source)).toThrow(
      expect.objectContaining({
        code: 'UNEXPECTED_CHARACTER',
        issues: [expect.objectContaining({ span: { start: 2, end: 5 } })],
      }),
    )
  })

  describe('unexpected character grapheme spans', () => {
    const extensions = [
      { name: 'combining mark', text: '\u0301' },
      { name: 'spacing mark', text: '\u093e' },
      { name: 'zero-width joiner', text: '\u200d' },
      { name: 'variation selector', text: '\ufe0f' },
      { name: 'supplementary emoji modifier', text: '\u{1f3fd}' },
      { name: 'multiple combining marks', text: '\u0301\u0327' },
    ]
    const tokenEnds = [
      { name: 'integer', before: '12', base: '3', after: '' },
      { name: 'fraction', before: '12.', base: '3', after: '' },
      { name: 'true literal', before: 'tru', base: 'e', after: '' },
      { name: 'false literal', before: 'fals', base: 'e', after: '' },
      { name: 'null literal', before: 'nul', base: 'l', after: '' },
      { name: 'identifier', before: '', base: 'x', after: '()' },
      { name: 'identifier underscore', before: 'fn', base: '_', after: '()' },
      { name: 'identifier digit', before: 'fn', base: '1', after: '()' },
      { name: 'single quote', before: "'x", base: "'", after: '' },
      { name: 'double quote', before: '"x', base: '"', after: '' },
      { name: 'addition', before: '1', base: '+', after: '2' },
      { name: 'subtraction', before: '1', base: '-', after: '2' },
      { name: 'multiplication', before: '1', base: '*', after: '2' },
      { name: 'division', before: '1', base: '/', after: '2' },
      { name: 'logical AND', before: 'true&', base: '&', after: 'false' },
      { name: 'logical OR', before: 'true|', base: '|', after: 'false' },
      { name: 'nullish coalescing', before: 'null?', base: '?', after: '3' },
      {
        name: 'conditional question mark',
        before: 'true',
        base: '?',
        after: '1:2',
      },
      { name: 'conditional colon', before: 'true?1', base: ':', after: '2' },
      { name: 'group opening parenthesis', before: '', base: '(', after: '1)' },
      { name: 'group closing parenthesis', before: '(1', base: ')', after: '' },
      {
        name: 'call opening parenthesis',
        before: 'GET',
        base: '(',
        after: '"x")',
      },
      {
        name: 'call closing parenthesis',
        before: 'GET("x"',
        base: ')',
        after: '',
      },
      {
        name: 'argument separator',
        before: 'GET("x"',
        base: ',',
        after: '"y")',
      },
      { name: 'leading space', before: ' \t', base: ' ', after: '1' },
      { name: 'trailing space', before: '1 ', base: ' ', after: '' },
    ]

    const tokenCases = tokenEnds.flatMap(({ name, before, base, after }) =>
      extensions.map(({ name: extension, text }) => ({
        name: `${name} with ${extension}`,
        prefix: `\${${before}`,
        grapheme: base + text,
        suffix: `${after}}`,
      })),
    )
    const keycapCases = [...'0123456789*#'].flatMap((base) => [
      {
        name: `keycap ${base} with a variation selector`,
        prefix: '키캡 ${',
        grapheme: `${base}\ufe0f\u20e3`,
        suffix: '}',
      },
      {
        name: `keycap ${base} without a variation selector`,
        prefix: '키캡 ${',
        grapheme: `${base}\u20e3`,
        suffix: '}',
      },
    ])

    it.each([
      ...tokenCases,
      ...keycapCases,
      {
        name: 'keycap at the end of a fraction',
        prefix: '${12.',
        grapheme: '3️⃣',
        suffix: '}',
      },
      {
        name: 'keycap at the end of an identifier',
        prefix: '${fn',
        grapheme: '1️⃣',
        suffix: '()}',
      },
      {
        name: 'keycap in place of a multiplication operator',
        prefix: '${1',
        grapheme: '*️⃣',
        suffix: '2}',
      },
      {
        name: 'combining mark after an escaped opener and an expression',
        prefix: '🌐 \\${example} ${1} ${',
        grapheme: 'x\u0301',
        suffix: '()}',
      },
      {
        name: 'standalone marks at the opening delimiter',
        prefix: '🌐 ${',
        grapheme: '\u0301\u0327',
        suffix: '1}',
      },
      {
        name: 'prepend character at the closing delimiter',
        prefix: '${',
        grapheme: '\u0600',
        suffix: '}\u0301',
      },
      {
        name: 'prepend character followed by an ASCII digit',
        prefix: '${',
        grapheme: '\u{600}1',
        suffix: '}',
      },
      {
        name: 'emoji adjacent to a valid token',
        prefix: '${1',
        grapheme: '😀',
        suffix: '}',
      },
      {
        name: 'regional indicator flag next to another flag',
        prefix: '${',
        grapheme: '🇰🇷',
        suffix: '🇺🇸}',
      },
      {
        name: 'Hangul jamo forming a single syllable',
        prefix: '${',
        grapheme: '각',
        suffix: '}',
      },
      ...[
        { name: 'tab', text: '\t' },
        { name: 'carriage return', text: '\r' },
        { name: 'line feed', text: '\n' },
        { name: 'CRLF', text: '\r\n' },
      ].map(({ name, text }) => ({
        name: `standalone combining mark after ${name}`,
        prefix: `\${${text}`,
        grapheme: '\u0301',
        suffix: '1}',
      })),
    ])(
      'reports the whole grapheme for $name',
      ({ prefix, grapheme, suffix }) => {
        const source = prefix + grapheme + suffix
        const start = prefix.length

        expect(() => zsl.compile(source)).toThrow(
          expect.objectContaining({
            code: 'UNEXPECTED_CHARACTER',
            issues: [
              expect.objectContaining({
                span: { start, end: start + grapheme.length },
              }),
            ],
          }),
        )
      },
    )
  })

  // 닫힌 구간을 파싱할 때는 지원하지 않는 이스케이프 위치를 보고한다.
  // 구간 자체가 닫히지 않으면 구간 탐색 오류를 먼저 보고한다.
  it.each([
    {
      source: '${"\\q"}',
      code: 'UNSUPPORTED_ESCAPE',
      message: '지원하지 않는 이스케이프입니다.',
      span: { start: 3, end: 5 },
    },
    {
      source: '${"\\q"',
      code: 'UNTERMINATED_TEMPLATE_EXPRESSION',
      message: "템플릿 표현식을 닫는 '}'가 없습니다.",
      span: { start: 0, end: 6 },
    },
  ])('reports $code for "$source"', ({ source, code, message, span }) => {
    const compile = () => zsl.compile(source)
    expect(compile).toThrow(ZslSyntaxError)
    expect(compile).toThrow(
      expect.objectContaining({
        code,
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
    const compiler = new ZSL({ maxInputLength: source.length })
    const snapshot = compiler.compile(source).getAstSnapshot()

    expect(new Expression(snapshot).evaluate()).toBe(String(additions + 1))
  })
})
