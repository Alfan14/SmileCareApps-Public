// Small helpers for reading JSON whose exact shape we do not fully control.
export type Raw = Record<string, unknown>;

export const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
export const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : typeof v === "number" ? String(v) : null);
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const sub = (o: Raw, key: string): Raw => (isObj(o[key]) ? (o[key] as Raw) : {});

/** [..] or { <key>: [..] } or { data: [..] } */
export function listOf(payload: unknown, key: string): Raw[] {
  const arr = Array.isArray(payload) ? payload : isObj(payload) ? (payload[key] ?? payload.data) : undefined;
  return Array.isArray(arr) ? arr.filter(isObj) : [];
}

/** { <key>: {..} } or the object itself (when it has an id) */
export function itemOf(payload: unknown, key: string): Raw | null {
  if (!isObj(payload)) return null;
  if (isObj(payload[key])) return payload[key] as Raw;
  return "id" in payload ? payload : null;
}
