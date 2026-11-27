import { describe, expect, it, vi } from 'vitest'
import { evaluateExpression } from '../src/evaluator/index.js'
import {
  ZslInvalidNumberFormatError,
  ZslUnknownFunctionError,
  ZslValidationError,
} from '../src/exception/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalCases } from './zsl.literal-cases.js'

const overflowingProduct = `${'9'.repeat(308)} * 2`

describe('evaluateExpression', () => {
  it('rejects a directly supplied AST with an unregistered call', () => {
    expect(() =>
      evaluateExpression({
        kind: 'call',
        name: 'missing',
        args: [],
        span: { start: 0, end: 9 },
      }),
    ).toThrow(ZslUnknownFunctionError)
  })

  // 파싱한 리터럴과 연산을 평가해 값과 타입을 확인한다.
  // 연산자 우선순위, 왼쪽 결합, 단락 평가, null에서만 적용하는 기본값 규칙을 포함한다.
  it.each([
    ...literalCases,
    { name: 'addition', input: '1 + 2', expected: 3 },
    { name: 'subtraction', input: '7 - 3', expected: 4 },
    { name: 'multiplication', input: '3 * 4', expected: 12 },
    { name: 'division', input: '8 / 2', expected: 4 },
    { name: 'precedence', input: '1 + 2 * 3', expected: 7 },
    { name: 'parentheses', input: '(1 + 2) * 3', expected: 9 },
    { name: 'nested parentheses', input: '((1 + 2) * (3 + 4))', expected: 21 },
    { name: 'left-associative subtraction', input: '8 - 3 - 2', expected: 3 },
    { name: 'left-associative division', input: '8 / 4 / 2', expected: 1 },
    {
      name: 'equal multiplication and division precedence',
      input: '24 / 3 * 2',
      expected: 16,
    },
    { name: 'decimal division', input: '3 / 2', expected: 1.5 },
    {
      name: 'number-only addition outside the safe integer range',
      input: '9007199254740991 + 2',
      // 두 피연산자가 모두 number라 정확한 합 9007199254740993은
      // 표현 가능한 두 값의 중간에 있어 9007199254740992로 반올림된다.
      expected: 9007199254740992,
    },
    {
      name: 'mixed integer addition',
      input: '1 + 9007199254740993',
      expected: 9007199254740994n,
    },
    {
      name: 'subtraction of adjacent large integers',
      input: '9007199254740993 - 9007199254740992',
      expected: 1n,
    },
    {
      name: 'promotion of the represented number value',
      input: '1000000000000000100.0 - 1000000000000000100',
      expected: 28n,
    },
    {
      name: 'mixed integer multiplication',
      input: '9007199254740993 * 3',
      expected: 27021597764222979n,
    },
    {
      name: 'mixed exact integer division',
      input: '18014398509481986 / 2',
      expected: 9007199254740993n,
    },
    {
      name: 'mixed division with a remainder',
      input: '1 / 9007199254740993',
      expected: 1.1102230246251565e-16,
    },
    {
      name: 'arithmetic with a fractional operand',
      input: '9007199254740993 + 1.5',
      expected: 9007199254740994,
    },
    { name: 'subtraction below zero', input: '2 - 5', expected: -3 },
    { name: 'whitespace between tokens', input: '1\t+\r\n2', expected: 3 },
    { name: 'grouped string literal', input: '("event")', expected: 'event' },
    { name: 'ternary true', input: 'true ? 1 : 2', expected: 1 },
    { name: 'ternary false', input: 'false ? 1 : 2', expected: 2 },
    { name: 'logical and', input: 'true && false', expected: false },
    {
      name: 'AND can return a true right operand',
      input: 'true && true',
      expected: true,
    },
    { name: 'logical or', input: 'false || true', expected: true },
    {
      name: 'OR can return a false right operand',
      input: 'false || false',
      expected: false,
    },
    { name: 'null fallback', input: 'null ?? 10', expected: 10 },
    { name: 'zero is not null', input: '0 ?? 10', expected: 0 },
    { name: 'false is not null', input: 'false ?? 10', expected: false },
    { name: 'empty string is not null', input: "'' ?? 10", expected: '' },
    {
      name: 'nested true branch',
      input: 'true ? false ? 1 : 2 : 3',
      expected: 2,
    },
    {
      name: 'nested false branch',
      input: 'false ? 1 : true ? 2 : 3',
      expected: 2,
    },
    {
      name: 'ternaries associate to the right',
      input: 'true ? true : false ? 2 : 3',
      expected: true,
    },
    {
      name: 'arithmetic binds more tightly than OR',
      input: 'true || 1 + 2',
      expected: true,
    },
    {
      name: 'arithmetic binds more tightly than AND',
      input: 'false && 1 + 2',
      expected: false,
    },
    {
      name: 'AND binds more tightly than OR',
      input: 'true || false && false',
      expected: true,
    },
    {
      name: 'parentheses override logical precedence',
      input: '(true || false) && false',
      expected: false,
    },
    {
      name: 'OR binds more tightly than null coalescing',
      input: 'false ?? false || true',
      expected: false,
    },
    {
      name: 'AND binds more tightly than null coalescing',
      input: 'true ?? false && false',
      expected: true,
    },
    {
      name: 'null coalescing binds more tightly than ternary',
      input: 'false??true?1:2',
      expected: 2,
    },
    {
      name: 'skips invalid false branch',
      input: "true ? 'yes' : false + 1",
      expected: 'yes',
    },
    {
      name: 'skips invalid true branch',
      input: "false ? 1 / 0 : 'no'",
      expected: 'no',
    },
    {
      name: 'AND skips invalid right operand',
      input: 'false && 1',
      expected: false,
    },
    {
      name: 'OR skips invalid right operand',
      input: 'true || null',
      expected: true,
    },
    {
      name: 'null coalescing skips invalid fallback',
      input: '0 ?? (1 / 0)',
      expected: 0,
    },
  ])('evaluates $name', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input))).toBe(expected)
  })

  it.each([
    { input: '1 + 2 >= 3 == true && true', expected: true },
    { input: "'5' == 5", expected: false },
    { input: "'5' != 5", expected: true },
    { input: "'5' == '5'", expected: true },
    { input: "'5' == '6'", expected: false },
    { input: '1 != 1', expected: false },
    { input: '1 != 2', expected: true },
    { input: 'true == 1', expected: false },
    { input: 'true == false', expected: false },
    { input: 'null != 0', expected: true },
    { input: '1 < 2', expected: true },
    { input: '2 < 2', expected: false },
    { input: '2 < 1', expected: false },
    { input: '1 <= 2', expected: true },
    { input: '2 <= 2', expected: true },
    { input: '3 <= 2', expected: false },
    { input: '3 > 2', expected: true },
    { input: '2 > 2', expected: false },
    { input: '2 > 3', expected: false },
    { input: '3 >= 2', expected: true },
    { input: '2 >= 2', expected: true },
    { input: '2 >= 3', expected: false },
    { input: '9007199254740992 == 9007199254740992.0', expected: true },
    { input: '9007199254740992 != 9007199254740992.0', expected: false },
    { input: '9007199254740993 == 9007199254740992.0', expected: false },
    { input: '9007199254740993 > 9007199254740992.0', expected: true },
    { input: '9007199254740992.0 < 9007199254740993', expected: true },
    { input: '1000000000000000100.0 > 1000000000000000100', expected: true },
    { input: '9007199254740993 - 9007199254740992 < 1.5', expected: true },
    { input: "GET('event', 'severity') == null", expected: true },
    { input: "(GET('event', 'severity') ?? 0) >= 5", expected: false },
  ])('evaluates comparison $input', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input))).toBe(expected)
  })

  // 왼쪽으로 깊어지는 덧셈 AST를 평가해 전체 연산의 합을 확인한다.
  // 호출 스택이 깊어지기 쉬운 구조에서 20,000개 연산을 끝까지 처리해야 한다.
  it('evaluates 20,000 left-associative additions', () => {
    const additions = 20_000
    const ast = parseExpression(`${'1+'.repeat(additions)}1`)

    expect(evaluateExpression(ast)).toBe(additions + 1)
  })

  // 각 삼항식의 조건 자리에 또 다른 삼항식을 넣어 분기를 선택하기 전부터 깊게 중첩시킨다.
  // 가장 안쪽 조건부터 바깥쪽까지 판정한 결과는 true다.
  it('evaluates 20,000 nested conditional conditions', () => {
    const depth = 20_000
    const input = `${'('.repeat(depth)}true${'?true:false)'.repeat(depth)}`

    expect(evaluateExpression(parseExpression(input))).toBe(true)
  })

  // 실제로 평가한 피연산자의 타입, 0으로 나누기, 유한 범위를 넘는 결과를 검사한다.
  // 오류의 진단 범위는 문제가 있는 피연산자나 연산 전체를 가리킨다.
  it.each([
    { input: '(null ?? 5) ? 1 : 2', span: { start: 0, end: 11 } },
    { input: '1 && (1 / 0)', span: { start: 0, end: 1 } },
    { input: 'null || true', span: { start: 0, end: 4 } },
    { input: 'true && (1 + 2)', span: { start: 8, end: 15 } },
    { input: "false || 'x'", span: { start: 9, end: 12 } },
    { input: 'true ? 1 / 0 : 2', span: { start: 11, end: 12 } },
    { input: 'false ? 1 : true + 1', span: { start: 12, end: 16 } },
    { input: 'null ?? (1 / 0)', span: { start: 13, end: 14 } },
    { input: 'true + 1', span: { start: 0, end: 4 } },
    { input: '1 + null', span: { start: 4, end: 8 } },
    {
      input: "GET('event', 'severity') >= 5",
      span: { start: 0, end: 24 },
    },
    { input: "1 < ('5')", span: { start: 4, end: 9 } },
    { input: 'true > 0', span: { start: 0, end: 4 } },
    { input: '1 / (2 - 2)', span: { start: 4, end: 11 } },
    {
      input: overflowingProduct,
      span: { start: 0, end: overflowingProduct.length },
    },
  ])('reports a validation issue for $input', ({ input, span }) => {
    const ast = parseExpression(input)
    const evaluate = () => evaluateExpression(ast)
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
        issues: [expect.objectContaining({ kind: 'validation', span })],
      }),
    )
  })
})

describe('GET', () => {
  const context = {
    event: {
      severity: 6,
      source: { ip: '192.0.2.1' },
      active: false,
      entry: null,
      entries: [{ count: 0 }],
    },
    keys: { severity: 'severity' },
  }

  // 중첩 객체와 배열을 조회하고 표현식이 만든 문자열도 경로에 사용할 수 있는지 확인한다.
  // 조회할 수 없는 경로는 null이 되며, 단락 평가에서 건너뛴 호출은 결과에 영향을 주지 않는다.
  it.each([
    { input: "GET('event', 'severity')", expected: 6 },
    { input: "GET('event', 'source', 'ip')", expected: '192.0.2.1' },
    { input: "4 + GET('event', 'severity')", expected: 10 },
    { input: "GET('event', 'active')", expected: false },
    { input: "GET('event', 'entry')", expected: null },
    { input: "GET('event', 'entries', '0', 'count')", expected: 0 },
    { input: "GET('event', 'entries', 'length')", expected: 1 },
    {
      input: "GET(true ? 'event' : 'other', GET('keys', 'severity'))",
      expected: 6,
    },
    { input: "GET('missing', 'key')", expected: null },
    { input: "GET('event', 'missing') ?? 'fallback'", expected: 'fallback' },
    { input: "GET('event', 'severity', 'key')", expected: null },
    { input: "GET('event', 'entry', 'key')", expected: null },
    { input: "false && GET('event', 1)", expected: false },
    { input: "true || GET('event', 1)", expected: true },
    { input: "1 ?? GET('event', 1)", expected: 1 },
    { input: "true ? 1 : GET('event', 1)", expected: 1 },
  ])('evaluates $input', ({ input, expected }) => {
    expect(evaluateExpression(parseExpression(input), context)).toBe(expected)
  })

  // 같은 AST를 컨텍스트 없이 평가한 뒤 서로 다른 두 컨텍스트로 재평가한다.
  // 컨텍스트 생략 시 결과는 null이고, 값을 전달하면 호출마다 그 값이 사용된다.
  it('evaluates the same AST with each supplied context', () => {
    const ast = parseExpression("GET('event', 'severity')")
    expect(evaluateExpression(ast)).toBeNull()
    expect(evaluateExpression(ast, context)).toBe(6)
    expect(evaluateExpression(ast, { event: { severity: 9 } })).toBe(9)
  })

  // 루트와 중첩 객체 모두에서 상속된 속성, undefined, 실제로 저장된 자체 데이터 속성을 구분한다.
  // GET은 자체 데이터 속성의 값을 반환하고 상속되거나 정의되지 않은 값은 null로 처리한다.
  it('reads only own data properties at every path segment', () => {
    const data = Object.setPrototypeOf(
      {
        event: Object.setPrototypeOf(
          { ['__proto__']: 'own value', missing: undefined },
          { inherited: 'nested value' },
        ),
      },
      { inherited: { value: 'root value' } },
    )

    for (const input of [
      "GET('inherited', 'value')",
      "GET('event', 'inherited')",
      "GET('event', 'constructor', 'name')",
      "GET('event', 'missing')",
    ]) {
      expect(evaluateExpression(parseExpression(input), data)).toBeNull()
    }
    expect(
      evaluateExpression(parseExpression("GET('event', '__proto__')"), data),
    ).toBe('own value')
  })

  // 경로 중간과 끝에서 접근자 속성을 만나면 조회 결과는 null이어야 한다.
  // 반환값과 함께 루트와 중첩 객체의 getter 호출 횟수가 모두 0인지 확인한다.
  it('skips accessors without invoking their getters', () => {
    const getRootAccessor = vi.fn(() => 'root accessor value')
    const getFieldAccessor = vi.fn(() => 'field accessor value')
    const data = {
      get rootAccessor() {
        return getRootAccessor()
      },
      event: {
        get fieldAccessor() {
          return getFieldAccessor()
        },
      },
    }

    for (const input of [
      "GET('rootAccessor', 'key')",
      "GET('event', 'fieldAccessor')",
      "GET('event', 'fieldAccessor', 'key')",
    ]) {
      expect(evaluateExpression(parseExpression(input), data)).toBeNull()
    }
    expect(getRootAccessor).not.toHaveBeenCalled()
    expect(getFieldAccessor).not.toHaveBeenCalled()
  })

  it('resolves a canonically equivalent Unicode root key', () => {
    const key = '가'.normalize('NFD')
    const ast = parseExpression(`GET('${key}', 'status')`)

    expect(evaluateExpression(ast, { 가: { status: '완료' } })).toBe('완료')
  })

  it('resolves a non-enumerable Unicode array key in the middle of a path', () => {
    const entries = Object.defineProperty([], '가'.normalize('NFD'), {
      value: { status: '완료' },
    })
    const ast = parseExpression("GET('entries', '가', 'status')")

    expect(evaluateExpression(ast, { entries })).toBe('완료')
  })

  it.each([
    {
      label: 'returns the exact match when equivalent keys coexist',
      event: { '\u00C5': '정확', '\u212B': '동등', 'A\u030A': '분해' },
      expected: '정확',
    },
    {
      label: 'returns the only canonically equivalent own key',
      event: { '\u212B': '동등' },
      expected: '동등',
    },
    {
      label: 'returns null when equivalent own keys collide',
      event: { '\u212B': '동등', 'A\u030A': '분해' },
      expected: null,
    },
    {
      label: 'ignores an inherited Unicode key',
      event: Object.setPrototypeOf({}, { '\u212B': '상속' }),
      expected: null,
    },
  ])('$label', ({ event, expected }) => {
    const ast = parseExpression("GET('event', 'Å')")

    expect(evaluateExpression(ast, { event })).toBe(expected)
  })

  it('skips Unicode accessors without invoking their getters', () => {
    const getter = vi.fn(() => '접근자')
    const ast = parseExpression("GET('event', 'Å')")
    const exactAccessor = Object.defineProperty(
      { '\u212B': '동등' },
      '\u00C5',
      { get: getter },
    )
    const equivalentAccessor = Object.defineProperty({}, '\u212B', {
      get: getter,
    })

    expect(evaluateExpression(ast, { event: exactAccessor })).toBeNull()
    expect(evaluateExpression(ast, { event: equivalentAccessor })).toBeNull()
    expect(getter).not.toHaveBeenCalled()
  })

  // 인자 개수, 인자 타입, 인자 표현식에서 난 오류를 구분한다.
  // 진단은 호출 전체, 잘못된 인자, 또는 인자 안에서 평가가 실패한 위치를 가리킨다.
  it.each([
    { input: 'GET()', source: 'GET()' },
    { input: "GET('event')", source: "GET('event')" },
    { input: "GET(false, 'severity')", source: 'false' },
    { input: "GET('event', (1 + 2))", source: '(1 + 2)' },
    { input: "GET('missing', true)", source: 'true' },
    { input: 'GET(1 / 0, false + 1)', source: '0' },
    { input: 'GET(false, 1 / 0)', source: '0' },
  ])('reports a validation issue for $input', ({ input, source }) => {
    const start = input.indexOf(source)
    const ast = parseExpression(input)
    const evaluate = () => evaluateExpression(ast, context)
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + source.length },
          }),
        ],
      }),
    )
  })

  // 경로 끝의 값에는 문자열, 불리언, null과 유한한 숫자만 허용한다.
  // 이 범위 밖의 값을 조회하면 전체 호출 범위에 검사 오류를 보고한다.
  it.each([
    { label: 'object', value: {} },
    { label: 'array', value: [] },
    { label: 'Date', value: new Date('2024-01-02T03:04:05.000Z') },
    { label: 'function', value: () => 1 },
    { label: 'bigint', value: 1n },
    { label: 'symbol', value: Symbol() },
    { label: 'NaN', value: Number.NaN },
    { label: 'Infinity', value: Number.POSITIVE_INFINITY },
  ])('rejects a final $label value', ({ value }) => {
    const input = "GET('event', 'value')"
    const ast = parseExpression(input)
    const evaluate = () => evaluateExpression(ast, { event: { value } })
    expect(evaluate).toThrow(ZslValidationError)
    expect(evaluate).toThrow(
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

  // 안쪽 GET의 결과를 다음 GET의 키로 사용해 20,000개의 호출을 연결한다.
  // 깊은 중첩에서도 각 인자를 평가하고 최종 문자열을 반환해야 한다.
  it('evaluates 20,000 nested GET calls', () => {
    const depth = 20_000
    const input = `${"GET('event', ".repeat(depth)}'key'${')'.repeat(depth)}`
    const ast = parseExpression(input)

    expect(evaluateExpression(ast, { event: { key: 'key' } })).toBe('key')
  })
})

describe('EXIST', () => {
  it.each([
    { label: 'a stored number', event: { severity: 6 }, expected: true },
    { label: 'a stored null', event: { severity: null }, expected: true },
    { label: 'a stored false', event: { severity: false }, expected: true },
    { label: 'a stored zero', event: { severity: 0 }, expected: true },
    { label: 'a stored empty string', event: { severity: '' }, expected: true },
    { label: 'a missing property', event: {}, expected: false },
    {
      label: 'a property storing undefined',
      event: { severity: undefined },
      expected: false,
    },
  ])('checks existence for $label', ({ event, expected }) => {
    const ast = parseExpression("EXIST('event', 'severity')")

    expect(evaluateExpression(ast, { event })).toBe(expected)
  })

  it.each([
    { input: "EXIST('event', 'source')", expected: true },
    { input: "EXIST('event', 'source', 'ip')", expected: false },
  ])('evaluates $input for an empty source object', ({ input, expected }) => {
    const ast = parseExpression(input)

    expect(evaluateExpression(ast, { event: { source: {} } })).toBe(expected)
  })

  it('matches a canonically equivalent Unicode property name', () => {
    const ast = parseExpression("EXIST('event', '가')")
    const event = { ['가'.normalize('NFD')]: '완료' }

    expect(evaluateExpression(ast, { event })).toBe(true)
  })

  it('returns false for a final accessor without invoking its getter', () => {
    const getter = vi.fn(() => 6)
    const event = Object.defineProperty({}, 'severity', { get: getter })
    const ast = parseExpression("EXIST('event', 'severity')")

    expect(evaluateExpression(ast, { event })).toBe(false)
    expect(getter).not.toHaveBeenCalled()
  })

  it.each([
    { input: "EXIST('event', 1)", span: { start: 15, end: 16 } },
    { input: "EXIST('missing', 'nested', 1)", span: { start: 27, end: 28 } },
  ])('reports an invalid argument at its span in $input', ({ input, span }) => {
    const ast = parseExpression(input)

    expect(() => evaluateExpression(ast, { event: {} })).toThrow(
      expect.objectContaining({
        code: 'INVALID_ARGUMENT_TYPE',
        functionName: 'EXIST',
        expectedType: 'string',
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span,
          }),
        ],
      }),
    )
  })
})

describe('FORMAT_NUM', () => {
  it.each([
    ['1234567890123.1', '# ????/????', '1234567890123    1/10  '],
    ['12345678901234.1', '# ???/???', '12345678901234   1/10 '],
  ])(
    'preserves the decimal remainder in %s with %s',
    (value, pattern, expected) => {
      const ast = parseExpression(
        `FORMAT_NUM(${value}, ${JSON.stringify(pattern)})`,
      )

      expect(evaluateExpression(ast)).toBe(expected)
    },
  )

  it.each([
    '',
    '0;0',
    '@',
    '[>0]0;[<0]0',
    '[Red]0',
    '"count "0',
    String.raw`0\!`,
    '0_)',
    '0*x',
    '00000-0000',
    '0é',
    '0\n',
    ' 0',
    '0 ',
    '# ##0.00',
    '#  ?/?',
    '# ? / ?',
    '#\t?/?',
    'MM/DD/YY',
    'hh:mm',
    'h:mm AM/PM',
    '[h]:mm',
    '[m]:ss',
    '[s]',
    '[$-ko-KR]#,##0.00',
    '[$-412]#,##0.00',
    '[$-0D00041E]#,##0.00',
    '[DBNum1]0',
    '표준',
    'G/표준',
    '$#,##0',
    '₩#,##0',
    '€#,##0',
    '0[$£-809]',
    '[$€-de-DE]#,##0.00',
    '[$USD-en-US]0',
    '[$-x-euro1]0',
    '0" ₩"',
    String.raw`0\$`,
    '0.0.0',
    '0.0,0',
    '0,,0',
    '?/',
    '?/02',
    'E+0',
    '0E+',
    '%0',
    '0%0',
    '0'.repeat(256),
  ])('rejects unsupported format %j at the pattern argument', (pattern) => {
    const argument = JSON.stringify(pattern)
    const input = `FORMAT_NUM(1234.5, ${argument})`
    const ast = parseExpression(input)
    const start = input.indexOf(argument)
    const evaluate = () => evaluateExpression(ast)

    expect(evaluate).toThrow(ZslInvalidNumberFormatError)
    expect(evaluate).toThrow(
      expect.objectContaining({
        code: 'INVALID_NUMBER_FORMAT',
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + argument.length },
          }),
        ],
      }),
    )
  })

  it.each([
    ['12200000', '#,###.0,', '12,200.0'],
    ['4.34', '# ???/???', '4  17/50 '],
    ['5.3', '# ?/?', '5 2/7'],
    ['0.667', '# ???/???', ' 665/997'],
    ['0.08', '# ?/?', '0    '],
    ['0', '#0.0E+0', '00.0E+0'],
    ['9007199254740993', 'General', '9007199254740993'],
    ['1234567', '#,##0', '1,234,567'],
    ['1234.5', '#,##0.00', '1,234.50'],
    ['12.5', '0.##', '12.5'],
    ['42', '0000', '0042'],
    ['1.005', '0.00', '1.01'],
    ['0 - 1.005', '0.00', '-1.01'],
    ['999.995', '#,##0.00', '1,000.00'],
    ['0 - 0.004', '0.00', '0.00'],
    ['9007199254740993', '#,##0', '9,007,199,254,740,993'],
    ['1234.56', '#,##0', '1,235'],
    ['12200000', '#,###', '12,200,000'],
    ['12200000', '0,000.00', '12,200,000.00'],
    ['12200000', '#,', '12200'],
    ['12200000', '0.0,,', '12.2'],
    ['0.285', '0.00%', '28.50%'],
    ['1234', '0%', '123400%'],
    ['0.0123', '0.0%%', '123.0%%'],
    ['12.34', '0.0E-00', '1.2E01'],
    ['0.0123', '0.0E-00', '1.2E-02'],
    ['999.95', '0.0E+00', '1.0E+03'],
    ['12200000', '0.00E+00', '1.22E+07'],
    ['4.34', '# ?/?', '4 1/3'],
    ['4.34', '# ?/2', '4 1/2'],
    ['8.9', '#.000', '8.900'],
    ['12', '#.0#', '12.0'],
    ['12', '.00', '12.00'],
    ['12', '0.', '12.'],
    ['12.5', 'General', '12.5'],
    ['1234.5', '#,##0.0?', '1,234.5 '],
  ])('formats %s with %s as %j', (value, pattern, expected) => {
    const ast = parseExpression(
      `FORMAT_NUM(${value}, ${JSON.stringify(pattern)})`,
    )

    expect(evaluateExpression(ast)).toBe(expected)
  })

  it.each([
    { input: "FORMAT_NUM(null, '0')", argument: 'null' },
    { input: "FORMAT_NUM('12', '0')", argument: "'12'" },
    {
      input: "FORMAT_NUM('2026-11-27T16:00:00Z', '0')",
      argument: "'2026-11-27T16:00:00Z'",
    },
    { input: 'FORMAT_NUM(1, 0)', argument: '0' },
  ])('reports an argument type error in $input', ({ input, argument }) => {
    const ast = parseExpression(input)
    const start = input.lastIndexOf(argument)

    expect(() => evaluateExpression(ast)).toThrow(
      expect.objectContaining({
        code: 'INVALID_ARGUMENT_TYPE',
        functionName: 'FORMAT_NUM',
        issues: [
          expect.objectContaining({
            kind: 'validation',
            span: { start, end: start + argument.length },
          }),
        ],
      }),
    )
  })
})
