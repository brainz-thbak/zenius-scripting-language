import type { ZSL } from './zsl.js'

export interface ZslOptions {
  readonly maxInputLength?: number | undefined
  readonly maxOutputLength?: number | undefined
}

export type ZslConstructor = new (options?: ZslOptions) => ZSL
