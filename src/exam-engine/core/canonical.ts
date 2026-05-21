import { createHash } from "crypto";

function isPlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function canonicalize(value: any): any {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const o: any = {};
    for (const k of keys) {
      o[k] = canonicalize(value[k]);
    }
    return o;
  }
  // primitives
  return value;
}

export function canonicalStringify(value: any): string {
  const c = canonicalize(value);
  return JSON.stringify(c);
}

export function hashObject(value: any): string {
  const s = canonicalStringify(value);
  return createHash("sha256").update(s).digest("hex");
}
