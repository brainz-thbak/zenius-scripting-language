import type { BinaryOperator, LiteralValue, SourceSpan } from '../ast/index.js'
import { syntaxError } from '../exception/index.js'

export type Token = { readonly span: SourceSpan } & (
  | { readonly kind: 'literal'; readonly value: LiteralValue }
  | { readonly kind: 'identifier'; readonly name: string }
  | { readonly kind: 'operator'; readonly operator: BinaryOperator }
  | { readonly kind: 'question' }
  | { readonly kind: 'colon' }
  | { readonly kind: 'leftParen' }
  | { readonly kind: 'rightParen' }
  | { readonly kind: 'comma' }
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

export function readToken(
  source: string,
  offset = 0,
  limit = source.length,
): Token {
  let start = offset
  while (start < limit && /[ \t\r\n]/.test(source.charAt(start))) {
    start++
  }
  if (start === limit) {
    return { kind: 'eof', span: { start, end: start } }
  }

  const pair = source.slice(start, Math.min(start + 2, limit))
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
    case ',':
      return { kind: 'comma', span: { start, end: start + 1 } }
  }
  if (character === '"' || character === "'") {
    return readString(source, start, limit, character)
  }
  if (/[0-9]/.test(character)) {
    return readNumber(source, start, limit)
  }
  if (/[a-zA-Z_]/.test(character)) {
    return readIdentifier(source, start, limit)
  }
  throw syntaxError('Unexpected character', {
    start,
    end: characterEnd(source, start, limit),
  })
}

function readString(
  source: string,
  start: number,
  limit: number,
  quote: string,
): Token {
  let value = ''
  for (let index = start + 1; index < limit; index++) {
    const character = source.charAt(index)
    if (character === quote) {
      return literalToken(value, start, index + 1)
    }
    if (character === '\\') {
      if (index + 1 === limit) {
        break
      }
      const escapedCharacter = source.charAt(index + 1)
      const decoded = stringEscapes.get(escapedCharacter)
      if (decoded === undefined) {
        throw syntaxError('Unsupported escape sequence', {
          start: index,
          end: characterEnd(source, index + 1, limit),
        })
      }
      value += decoded
      index++
    } else {
      if (source.charCodeAt(index) < 0x20) {
        throw syntaxError('Unexpected control character in string', {
          start: index,
          end: index + 1,
        })
      }
      value += character
    }
  }
  throw syntaxError('Unterminated string', { start, end: limit })
}

function readNumber(source: string, start: number, limit: number): Token {
  let end = digitEnd(source, start, limit)
  if (end < limit && source.charAt(end) === '.') {
    const fractionStart = end + 1
    const fractionEnd = digitEnd(source, fractionStart, limit)
    if (fractionStart === fractionEnd) {
      throw syntaxError('Expected a digit after the decimal point', {
        start: end,
        end: fractionStart,
      })
    }
    end = fractionEnd
  }
  const value = Number(source.slice(start, end))
  if (!Number.isFinite(value)) {
    throw syntaxError('Number must be finite', { start, end })
  }
  return literalToken(value, start, end)
}

function digitEnd(source: string, start: number, limit: number): number {
  let end = start
  while (end < limit && /[0-9]/.test(source.charAt(end))) {
    end++
  }
  return end
}

function readIdentifier(source: string, start: number, limit: number): Token {
  let end = start + 1
  while (end < limit && /[a-zA-Z0-9_]/.test(source.charAt(end))) {
    end++
  }
  const name = source.slice(start, end)
  switch (name) {
    case 'true':
      return literalToken(true, start, end)
    case 'false':
      return literalToken(false, start, end)
    case 'null':
      return literalToken(null, start, end)
    default:
      return { kind: 'identifier', name, span: { start, end } }
  }
}

function literalToken(value: LiteralValue, start: number, end: number): Token {
  return { kind: 'literal', value, span: { start, end } }
}

function characterEnd(source: string, start: number, limit: number): number {
  const length = (source.codePointAt(start) ?? 0) > 0xffff ? 2 : 1
  return Math.min(start + length, limit)
}
