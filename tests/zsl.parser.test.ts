import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { SourceSpan } from '../src/ast/index.js'
import {
  ZslSyntaxError,
  ZslUnknownFunctionError,
} from '../src/exception/index.js'
import { builtinFunctions } from '../src/functions/functions.js'
import { readToken } from '../src/lexer/index.js'
import { parseExpression } from '../src/parser/index.js'
import { literalCases } from './zsl.literal-cases.js'

describe('readToken', () => {
  // 직전 토큰의 끝 오프셋에서 다음 읽기를 시작한다.
  // 공백은 건너뛰되 토큰 범위는 원문 위치를 유지하고 EOF는 원문 끝의 빈 범위를 사용한다.
  it('reads a single token at a time from source offsets', () => {
    const source = ' 4 false '
    const first = readToken(source)
    expect(first).toEqual({
      kind: 'literal',
      value: 4,
      span: { start: 1, end: 2 },
    })
    const second = readToken(source, first.span.end)
    expect(second).toEqual({
      kind: 'literal',
      value: false,
      span: { start: 3, end: 8 },
    })
    expect(readToken(source, second.span.end)).toEqual({
      kind: 'eof',
      span: { start: 9, end: 9 },
    })
  })

  // 연속 물음표에서는 ??를 먼저 하나의 토큰으로 읽는다.
  // 뒤에 남은 ?와 :는 별도 토큰으로 읽고 각각의 범위를 기록한다.
  it('reads null coalescing before a single question mark', () => {
    const source = ' ???:'
    expect(readToken(source)).toEqual({
      kind: 'operator',
      operator: '??',
      span: { start: 1, end: 3 },
    })
    expect(readToken(source, 3)).toEqual({
      kind: 'question',
      span: { start: 3, end: 4 },
    })
    expect(readToken(source, 4)).toEqual({
      kind: 'colon',
      span: { start: 4, end: 5 },
    })
  })

  // 공백을 사이에 둔 괄호와 연산자를 각각 한 글자 토큰으로 읽는다.
  // 토큰 범위는 입력 문자열에서 해당 기호가 있는 위치와 일치해야 한다.
  it('reads arithmetic operators and parentheses with their original ranges', () => {
    const source = '( + )'
    expect(readToken(source)).toEqual({
      kind: 'leftParen',
      span: { start: 0, end: 1 },
    })
    expect(readToken(source, 1)).toEqual({
      kind: 'operator',
      operator: '+',
      span: { start: 2, end: 3 },
    })
    expect(readToken(source, 3)).toEqual({
      kind: 'rightParen',
      span: { start: 4, end: 5 },
    })
  })
})

describe('parseExpression', () => {
  it('accepts every builtin function named in the EBNF and registry', () => {
    const spec = readFileSync(
      new URL('../spec/zsl.ebnf', import.meta.url),
      'utf8',
    )
    const rule = spec.match(/^builtin function\s*=([^;]+);/m)?.[1] ?? ''
    const names = Array.from(rule.matchAll(/"([^"]+)"/g), ([, name]) => name)

    expect(names.sort()).toEqual([...builtinFunctions.keys()].sort())
    for (const name of names) {
      expect(parseExpression(`${name}()`)).toMatchObject({ kind: 'call', name })
    }
  })

  // 공통 리터럴 표의 원문을 파싱해 디코딩한 값과 전체 원문 범위를 가진 AST를 확인한다.
  it.each(literalCases)('parses $name', ({ input, expected }) => {
    expect(parseExpression(input)).toEqual({
      kind: 'literal',
      value: expected,
      span: { start: 0, end: input.length },
    })
  })

  // 이모지와 이스케이프의 해석 결과는 AST의 값에 들어간다.
  // 범위는 주변 공백을 제외하고 따옴표를 포함한 원문을 UTF-16 코드 단위로 잰다.
  it('measures the original literal in UTF-16 code units', () => {
    expect(parseExpression(" \t'😀\\n'\r\n")).toEqual({
      kind: 'literal',
      value: '😀\n',
      span: { start: 2, end: 8 },
    })
  })

  // 외부 호출의 인자에 이모지 문자열과 인자 없는 내부 호출을 넣는다.
  // 각 인자와 호출은 원문의 자기 범위를 가지며, 내부 호출의 인자 배열은 비어 있다.
  it('parses nested calls and an empty argument list with UTF-16 spans', () => {
    expect(parseExpression(" GET ('😀', EXIST()) ")).toEqual({
      kind: 'call',
      name: 'GET',
      args: [
        { kind: 'literal', value: '😀', span: { start: 6, end: 10 } },
        {
          kind: 'call',
          name: 'EXIST',
          args: [],
          span: { start: 12, end: 19 },
        },
      ],
      span: { start: 1, end: 20 },
    })
  })

  it.each([
    { name: 'unknown', input: 'unknown()' },
    { name: 'get', input: "get('event', 'severity')" },
    { name: 'GET2', input: "GET2('event', 'severity')" },
    { name: 'constructor', input: 'constructor()' },
    { name: 'toString', input: 'toString()' },
    { name: '__proto__', input: '__proto__()' },
    { name: 'fetch', input: 'fetch("/")' },
    { name: 'XMLHttpRequest', input: 'XMLHttpRequest()' },
    { name: 'dayjs', input: 'dayjs()' },
    { name: 'missing', input: "GET('😀', missing())" },
    { name: 'missing', input: 'true || missing()' },
  ])(
    'rejects an unregistered call in $input while parsing',
    ({ name, input }) => {
      const start = input.indexOf(name)
      const parse = () => parseExpression(input)

      expect(parse).toThrow(ZslSyntaxError)
      expect(parse).toThrow(ZslUnknownFunctionError)
      expect(parse).toThrow(
        expect.objectContaining({
          code: 'UNKNOWN_FUNCTION',
          functionName: name,
          issues: [
            expect.objectContaining({
              kind: 'syntax',
              span: { start, end: start + name.length },
            }),
          ],
        }),
      )
    },
  )

  // 괄호로 묶은 덧셈은 곱셈 AST의 왼쪽 피연산자가 된다.
  // 덧셈 범위에는 괄호가 포함되고, 리터럴 범위는 실제 숫자 위치를 가리킨다.
  it('groups parentheses before multiplication and includes them in the span', () => {
    expect(parseExpression(' (1 + 2) * 3 ')).toEqual({
      kind: 'binary',
      operator: '*',
      left: {
        kind: 'binary',
        operator: '+',
        left: { kind: 'literal', value: 1, span: { start: 2, end: 3 } },
        right: { kind: 'literal', value: 2, span: { start: 6, end: 7 } },
        span: { start: 1, end: 8 },
      },
      right: { kind: 'literal', value: 3, span: { start: 11, end: 12 } },
      span: { start: 1, end: 12 },
    })
  })

  it('groups arithmetic, ordering, equality and AND in precedence order', () => {
    expect(parseExpression('1 + 2 >= 3 == true && true')).toMatchObject({
      kind: 'binary',
      operator: '&&',
      left: {
        kind: 'binary',
        operator: '==',
        left: {
          kind: 'binary',
          operator: '>=',
          left: {
            kind: 'binary',
            operator: '+',
            left: { kind: 'literal', value: 1 },
            right: { kind: 'literal', value: 2 },
          },
          right: { kind: 'literal', value: 3 },
        },
        right: { kind: 'literal', value: true },
      },
      right: { kind: 'literal', value: true },
    })
  })

  it('groups higher-precedence operators to the right of lower-precedence ones', () => {
    expect(parseExpression('true && true == 3 <= 1 + 2')).toMatchObject({
      operator: '&&',
      right: {
        operator: '==',
        right: { operator: '<=', right: { operator: '+' } },
      },
    })
  })

  it.each([
    { input: '1<2<=3', inner: '<', outer: '<=' },
    { input: '1==1!=false', inner: '==', outer: '!=' },
  ])(
    'groups comparisons from the left in $input',
    ({ input, inner, outer }) => {
      expect(parseExpression(input)).toMatchObject({
        kind: 'binary',
        operator: outer,
        left: { kind: 'binary', operator: inner },
        right: { kind: 'literal' },
      })
    },
  )

  // 같은 연산자가 반복되면 왼쪽 두 항을 먼저 묶어 바깥 노드의 왼쪽에 둔다.
  // &&, ||, ??가 각각 이 결합 규칙을 따르는지 AST 모양으로 확인한다.
  it.each([
    { input: 'true && false && true', operator: '&&' },
    { input: 'true || false || true', operator: '||' },
    { input: 'null ?? null ?? 1', operator: '??' },
  ])(
    'groups repeated $operator operators from the left',
    ({ input, operator }) => {
      expect(parseExpression(input)).toMatchObject({
        kind: 'binary',
        operator,
        left: { kind: 'binary', operator },
        right: { kind: 'literal' },
      })
    },
  )

  // 삼항식 전체 범위는 바깥 괄호까지 포함한다.
  // 조건과 두 분기는 각각의 리터럴이 놓인 범위를 유지해야 한다.
  it('keeps branch spans inside a grouped conditional', () => {
    expect(parseExpression(' (true ? 1 : 2) ')).toEqual({
      kind: 'conditional',
      condition: { kind: 'literal', value: true, span: { start: 2, end: 6 } },
      whenTrue: { kind: 'literal', value: 1, span: { start: 9, end: 10 } },
      whenFalse: { kind: 'literal', value: 2, span: { start: 13, end: 14 } },
      span: { start: 1, end: 15 },
    })
  })

  // 하나의 리터럴을 괄호 20,000쌍으로 감싸 파싱한다.
  // 깊은 중첩에서도 리터럴 값과 가장 바깥 괄호까지 포함하는 범위가 유지된다.
  it('parses 20,000 nested groups and keeps the full source range', () => {
    const depth = 20_000
    const input = `${'('.repeat(depth)}1${')'.repeat(depth)}`

    expect(parseExpression(input)).toEqual({
      kind: 'literal',
      value: 1,
      span: { start: 0, end: input.length },
    })
  })

  // 불완전한 표현식, 잘못된 구분자, ZSL 문법 범위 밖의 구문은 문법 오류가 된다.
  // 범위를 명시한 사례에서는 오류 위치의 UTF-16 오프셋도 확인한다.
  it.each<{ name: string; input: string; span?: SourceSpan }>([
    { name: 'empty', input: '', span: { start: 0, end: 0 } },
    { name: 'whitespace only', input: ' \t\r\n', span: { start: 4, end: 4 } },
    { name: 'adjacent literals', input: '4 5', span: { start: 2, end: 3 } },
    { name: 'unclosed string', input: "'event", span: { start: 0, end: 6 } },
    { name: 'unclosed escape', input: "'event\\", span: { start: 0, end: 7 } },
    {
      name: 'unsupported string escape',
      input: "'\\q'",
      span: { start: 1, end: 3 },
    },
    { name: 'missing integer part', input: '.5', span: { start: 0, end: 1 } },
    {
      name: 'missing fractional part',
      input: '4.',
      span: { start: 1, end: 2 },
    },
    { name: 'unclosed group', input: '(1 + 2', span: { start: 6, end: 6 } },
    { name: 'missing operand', input: '1 +', span: { start: 3, end: 3 } },
    {
      name: 'missing comparison operand',
      input: '1 >=',
      span: { start: 4, end: 4 },
    },
    { name: 'empty group', input: '()', span: { start: 1, end: 2 } },
    {
      name: 'operator in place of an operand',
      input: '1 + * 2',
      span: { start: 4, end: 5 },
    },
    {
      name: 'unmatched closing parenthesis',
      input: '1 + 2)',
      span: { start: 5, end: 6 },
    },
    {
      name: 'adjacent literals in a group',
      input: '(1 2)',
      span: { start: 3, end: 4 },
    },
    { name: 'missing colon', input: 'true ? 1', span: { start: 8, end: 8 } },
    {
      name: 'missing true branch',
      input: 'true ? : 2',
      span: { start: 7, end: 8 },
    },
    {
      name: 'missing false branch',
      input: 'true ? 1 :',
      span: { start: 10, end: 10 },
    },
    {
      name: 'extra colon',
      input: 'true ? 1 : 2 : 3',
      span: { start: 13, end: 14 },
    },
    {
      name: 'colon outside its group',
      input: '(true ? 1) : 2',
      span: { start: 9, end: 10 },
    },
    {
      name: 'missing logical operand',
      input: 'true &&',
      span: { start: 7, end: 7 },
    },
    {
      name: 'single ampersand',
      input: 'true & false',
      span: { start: 5, end: 6 },
    },
    { name: 'single pipe', input: 'true | false', span: { start: 5, end: 6 } },
    {
      name: 'extra question mark after null coalescing',
      input: 'null ??? 1',
      span: { start: 7, end: 8 },
    },
    {
      name: 'missing call closing parenthesis',
      input: "GET('😀'",
      span: { start: 8, end: 8 },
    },
    {
      name: 'missing argument and call closing parenthesis',
      input: 'GET(',
      span: { start: 4, end: 4 },
    },
    {
      name: 'missing first argument',
      input: "GET(, 'x')",
      span: { start: 4, end: 5 },
    },
    {
      name: 'missing middle argument',
      input: "GET('😀',,'x')",
      span: { start: 9, end: 10 },
    },
    { name: 'trailing comma', input: "GET('a',)", span: { start: 8, end: 9 } },
    {
      name: 'missing comma',
      input: "GET('a' 'b')",
      span: { start: 8, end: 11 },
    },
    {
      name: 'comma in a group',
      input: "GET(('a','b'), 'c')",
      span: { start: 8, end: 9 },
    },
    { name: 'true is reserved', input: 'true()', span: { start: 4, end: 5 } },
    { name: 'false is reserved', input: 'false()', span: { start: 5, end: 6 } },
    { name: 'null is reserved', input: 'null()', span: { start: 4, end: 5 } },
    { name: 'multiple expressions', input: '1; 2' },
    { name: 'assignment', input: 'a = 1' },
    { name: 'compound assignment', input: 'a += 1' },
    { name: 'increment', input: 'a++' },
    { name: 'decrement', input: '--a' },
    { name: 'const declaration', input: 'const a = 1' },
    { name: 'let declaration', input: 'let a = 1' },
    { name: 'var declaration', input: 'var a = 1' },
    { name: 'function declaration', input: 'function f() {}' },
    { name: 'if statement', input: 'if (true) 1' },
    { name: 'for statement', input: 'for (;;) {}' },
    { name: 'switch statement', input: 'switch (1) {}' },
    { name: 'while statement', input: 'while (true) {}' },
    { name: 'with statement', input: 'with (event) {}' },
    { name: 'dot access', input: 'event.severity', span: { start: 5, end: 6 } },
    {
      name: 'bracket access',
      input: 'event["severity"]',
      span: { start: 5, end: 6 },
    },
    { name: 'dot access after a call', input: "GET('event', 'source').ip" },
    {
      name: 'bracket access after a call',
      input: "GET('event', 'source')['ip']",
    },
    { name: 'calling a returned value', input: "GET('event', 'severity')()" },
    {
      name: 'bare window identifier',
      input: 'window',
      span: { start: 0, end: 6 },
    },
    {
      name: 'bare document identifier after whitespace',
      input: ' document ',
      span: { start: 1, end: 9 },
    },
    { name: 'bare Vue identifier', input: 'Vue', span: { start: 0, end: 3 } },
  ])('rejects $name', ({ input, span }) => {
    const parse = () => parseExpression(input)
    expect(parse).toThrow(ZslSyntaxError)
    expect(parse).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining(
            span === undefined ? { kind: 'syntax' } : { kind: 'syntax', span },
          ),
        ],
      }),
    )
  })

  // 부호 있는 숫자, 지수와 16진수, 대문자 키워드, 허용 범위 밖의 공백과 줄바꿈을 거부한다.
  it.each(['-4', '1e3', '0x10', 'TRUE', '\u00a04', "'line\nfeed'"])(
    'rejects %j outside the literal grammar',
    (input) => {
      expect(() => parseExpression(input)).toThrow(ZslSyntaxError)
    },
  )

  // 자릿수 규칙을 만족해도 변환 결과가 유한하지 않으면 숫자 리터럴을 거부한다.
  // 진단 범위는 숫자 원문 전체다.
  it('rejects a decimal that cannot be represented as a finite number', () => {
    const input = '9'.repeat(309)
    const parse = () => parseExpression(input)
    expect(parse).toThrow(ZslSyntaxError)
    expect(parse).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            kind: 'syntax',
            span: { start: 0, end: input.length },
          }),
        ],
      }),
    )
  })
})
