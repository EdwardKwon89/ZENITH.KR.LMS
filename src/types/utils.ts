export type WithRelations<
  T extends Record<string, unknown>,
  R extends Record<string, unknown> = Record<string, unknown>
> = T & R & { [key: string]: unknown };
