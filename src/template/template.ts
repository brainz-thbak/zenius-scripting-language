import type { TemplateAst, TemplatePart } from '../ast/index.js'
import { checkExpression } from '../checker/index.js'
import { syntaxError } from '../exception/index.js'
import { parseExpression } from '../parser/index.js'

export function compileTemplate(source: string): TemplateAst {
  const parts: TemplatePart[] = []
  let textStart = 0
  for (
    let opener = source.indexOf('${');
    opener !== -1;
    opener = source.indexOf('${', textStart)
  ) {
    if (opener > textStart) {
      parts.push({ kind: 'text', value: source.slice(textStart, opener) })
    }
    const start = opener + 2
    const end = findExpressionEnd(source, start)
    if (end === source.length) {
      throw syntaxError('Unterminated template expression', {
        start: opener,
        end,
      })
    }
    const expression = parseExpression(source, { start, end })
    checkExpression(expression)
    parts.push({ kind: 'expression', expression })
    textStart = end + 1
  }
  if (textStart < source.length) {
    parts.push({ kind: 'text', value: source.slice(textStart) })
  }
  return parts
}

function findExpressionEnd(source: string, start: number): number {
  let quote: '"' | "'" | undefined
  for (let index = start; index < source.length; index++) {
    const character = source.charAt(index)
    if (quote === undefined) {
      if (character === '}') {
        return index
      }
      if (character === '"' || character === "'") {
        quote = character
      }
    } else if (character === '\\') {
      index++
    } else if (character === quote) {
      quote = undefined
    }
  }
  return source.length
}
