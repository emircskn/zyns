/**
 * A check of a request body against the model's own input schema, as the
 * catalogue gives it: what is required, each value's type, the choices an
 * enum allows, a number's range and a list's length. Run on the body as it
 * is about to go out, so whatever built it (our defaults, a recreated run,
 * an element's pictures) is held to what Higgsfield accepts.
 */

export interface SchemaProp {
  type?: string | string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  items?: SchemaProp;
}

export type SchemaTop = Record<string, SchemaProp>;

function typeOf(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function fits(value: unknown, type: string | string[] | undefined): boolean {
  if (!type) return true;
  const types = Array.isArray(type) ? type : [type];
  const actual = typeOf(value);
  return types.some((t) => t === actual || (t === "number" && actual === "integer"));
}

function checkValue(key: string, value: unknown, prop: SchemaProp): string | null {
  if (!fits(value, prop.type)) return `${key} should be ${Array.isArray(prop.type) ? prop.type.join(" or ") : prop.type}.`;
  if (prop.enum && !prop.enum.includes(value)) return `${key} cannot be "${String(value)}".`;
  if (typeof value === "number") {
    if (prop.minimum !== undefined && value < prop.minimum) return `${key} must be ${prop.minimum} or more.`;
    if (prop.maximum !== undefined && value > prop.maximum) return `${key} must be ${prop.maximum} or less.`;
  }
  if (typeof value === "string") {
    if (prop.minLength !== undefined && value.length < prop.minLength) return `${key} is too short.`;
    if (prop.maxLength !== undefined && value.length > prop.maxLength) return `${key} is too long.`;
  }
  if (Array.isArray(value)) {
    if (prop.minItems !== undefined && value.length < prop.minItems) return `${key} needs at least ${prop.minItems}.`;
    if (prop.maxItems !== undefined && value.length > prop.maxItems) return `${key} takes at most ${prop.maxItems}.`;
    if (prop.items) {
      for (const item of value) {
        const problem = checkValue(`${key} item`, item, prop.items);
        if (problem) return problem;
      }
    }
  }
  return null;
}

/** Every way `body` breaks the schema, in the schema's own words; empty when it fits. */
export function schemaProblems(top: SchemaTop, body: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const [key, prop] of Object.entries(top)) {
    const value = body[key];
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (prop.required) problems.push(`${key} is required.`);
      continue;
    }
    const problem = checkValue(key, value, prop);
    if (problem) problems.push(problem);
  }
  for (const key of Object.keys(body)) {
    if (!(key in top)) problems.push(`${key} is not a setting this model takes.`);
  }
  return problems;
}
