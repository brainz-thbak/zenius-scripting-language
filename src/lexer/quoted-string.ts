export type StringQuote = '"' | "'"

export function isStringQuote(character: string): character is StringQuote {
  return character === '"' || character === "'"
}

export function scanQuotedString(
  source: string,
  start: number,
  limit: number,
  quote: StringQuote,
  visit?: (character: string, rawStart: number, escaped: boolean) => void,
): number | undefined {
  for (let index = start + 1; index < limit; index++) {
    const character = source.charAt(index)
    if (character === quote) {
      return index + 1
    }
    if (character === '\\') {
      if (index + 1 === limit) {
        return undefined
      }
      visit?.(source.charAt(index + 1), index, true)
      index++
    } else {
      visit?.(character, index, false)
    }
  }
  return undefined
}
