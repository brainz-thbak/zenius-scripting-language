export type ZslContext = Readonly<Record<string, unknown>>

export interface ExpressionContract {
  evaluate(context?: ZslContext): string
}
