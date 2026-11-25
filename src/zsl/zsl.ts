import type { Expression } from '../expression/index.js'

export class ZSL {
  compile(_source: string): Expression {
    throw new Error('ZSL.compile() is not implemented')
  }
}
