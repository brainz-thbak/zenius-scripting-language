import type { BinaryOperator, LiteralValue, SourceSpan } from '../ast/index.js'
import { ZslValidationError } from '../exception/index.js'

export type Token = { readonly span: SourceSpan } & (
  | { readonly kind: 'literal'; readonly value: LiteralValue }
  | { readonly kind: 'operator'; readonly operator: BinaryOperator }
  | { readonly kind: 'question' }
  | { readonly kind: 'colon' }
  | { readonly kind: 'leftParen' }
  | { readonly kind: 'rightParen' }
  | { readonly kind: 'eof' }
)

const stringEscapes = new Map([
  ['\\', '\\'],
  ["'", "'"],
  ['"', '"'],
  ['n', '\n'],
  ['r', '\r'],
  ['t', '\t'],
])

export function readToken(source: string, offset = 0): Token {
  let start = offset
  while (/[ \t\r\n]/.test(source.charAt(start))) {
    start++
  }
  if (start === source.length) {
    return { kind: 'eof', span: { start, end: start } }
  }

  const pair = source.slice(start, start + 2)
  switch (pair) {
    case '&&':
    case '||':
    case '??':
      return {
        kind: 'operator',
        operator: pair,
        span: { start, end: start + 2 },
      }
  }

  const character = source.charAt(start)
  switch (character) {
    case '+':
    case '-':
    case '*':
    case '/':
      return {
        kind: 'operator',
        operator: character,
        span: { start, end: start + 1 },
      }
    case '?':
      return { kind: 'question', span: { start, end: start + 1 } }
    case ':':
      return { kind: 'colon', span: { start, end: start + 1 } }
    case '(':
      return { kind: 'leftParen', span: { start, end: start + 1 } }
    case ')':
      return { kind: 'rightParen', span: { start, end: start + 1 } }
  }
  if (character === '"' || character === "'") {
    return readString(source, start, character)
  }
  if (/[0-9]/.test(character)) {
    return readNumber(source, start)
  }
  if (/[a-zA-Z_]/.test(character)) {
    return readKeyword(source, start)
  }
  throw syntaxError('Unexpected character', start, characterEnd(source, start))
}

function readString(source: string, start: number, quote: string): Token {
  let value = ''
  for (let index = start + 1; index < source.length; index++) {
    const character = source.charAt(index)
    if (character === quote) {
      return literalToken(value, start, index + 1)
    }
    if (character === '\\') {
      const escapedCharacter = source.charAt(index + 1)
      if (escapedCharacter === '') {
        break
      }
      const decoded = stringEscapes.get(escapedCharacter)
      if (decoded === undefined) {
        throw syntaxError(
          'Unsupported escape sequence',
          index,
          characterEnd(source, index + 1),
        )
      }
      value += decoded
      index++
    } else {
      if (source.charCodeAt(index) < 0x20) {
        throw syntaxError(
          'Unexpected control character in string',
          index,
          index + 1,
        )
      }
      value += character
    }
  }
  throw syntaxError('Unterminated string', start, source.length)
}

function readNumber(source: string, start: number): Token {
  let end = digitEnd(source, start)
  if (source.charAt(end) === '.') {
    const fractionStart = end + 1
    const fractionEnd = digitEnd(source, fractionStart)
    if (fractionStart === fractionEnd) {
      throw syntaxError(
        'Expected a digit after the decimal point',
        end,
        fractionStart,
      )
    }
    end = fractionEnd
  }
  const value = Number(source.slice(start, end))
  if (!Number.isFinite(value)) {
    throw syntaxError('Number must be finite', start, end)
  }
  return literalToken(value, start, end)
}

function digitEnd(source: string, start: number): number {
  let end = start
  while (/[0-9]/.test(source.charAt(end))) {
    end++
  }
  return end
}

function readKeyword(source: string, start: number): Token {
  let end = start + 1
  while (/[a-zA-Z0-9_]/.test(source.charAt(end))) {
    end++
  }
  switch (source.slice(start, end)) {
    case 'true':
      return literalToken(true, start, end)
    case 'false':
      return literalToken(false, start, end)
    case 'null':
      return literalToken(null, start, end)
    default:
      throw syntaxError('Unknown identifier', start, end)
  }
}

function literalToken(value: LiteralValue, start: number, end: number): Token {
  return { kind: 'literal', value, span: { start, end } }
}

function characterEnd(source: string, start: number): number {
  return start + ((source.codePointAt(start) ?? 0) > 0xffff ? 2 : 1)
}

function syntaxError(
  message: string,
  start: number,
  end: number,
): ZslValidationError {
  return new ZslValidationError([
    { kind: 'syntax', message, span: { start, end } },
  ])
}
