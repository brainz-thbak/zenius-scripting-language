import { Expression } from '../expression/index.js'
import { compileTemplate } from '../template/template.js'

export class ZSL {
  compile(source: string): Expression {
    return new Expression(compileTemplate(source))
  }
}
