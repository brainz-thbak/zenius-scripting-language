import type { TemplateAst, TemplatePart } from '../ast/index.js'
import { checkExpression } from '../checker/index.js'
import { ZslUnterminatedTemplateExpressionError } from '../exception/index.js'
import { isStringQuote, scanQuotedString } from '../lexer/quoted-string.js'
import { parseExpression } from '../parser/index.js'

export function compileTemplate(source: string): TemplateAst {
  const parts: TemplatePart[] = []
  let textStart = 0
  let text = ''
  for (
    let opener = source.indexOf('${');
    opener !== -1;
    opener = source.indexOf('${', textStart)
  ) {
    let backslashStart = opener
    while (
      backslashStart > textStart &&
      source.charAt(backslashStart - 1) === '\\'
    ) {
      backslashStart--
    }
    const backslashCount = opener - backslashStart
    text += source.slice(textStart, backslashStart)
    text += '\\'.repeat(Math.floor(backslashCount / 2))

    const start = opener + 2
    if (backslashCount % 2 !== 0) {
      text += '${'
      textStart = start
      continue
    }
    if (text.length > 0) {
      parts.push({ kind: 'text', value: text })
      text = ''
    }

    const end = findExpressionEnd(source, start)
    if (end === source.length) {
      throw new ZslUnterminatedTemplateExpressionError({
        start: opener,
        end,
      })
    }
    const expression = parseExpression(source, { start, end })
    checkExpression(expression)
    parts.push({ kind: 'expression', expression })
    textStart = end + 1
  }
  text += source.slice(textStart)
  if (text.length > 0) {
    parts.push({ kind: 'text', value: text })
  }
  return parts
}

function findExpressionEnd(source: string, start: number): number {
  const limit = source.length
  for (let index = start; index < limit; ) {
    const character = source.charAt(index)
    if (character === '}') {
      return index
    }
    index = isStringQuote(character)
      ? (scanQuotedString(source, index, limit, character) ?? limit)
      : index + 1
  }
  return limit
}
