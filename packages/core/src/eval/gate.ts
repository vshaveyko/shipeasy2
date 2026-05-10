// evalGate — boolean evaluation: rules AND match → rollout hash bucket.
// See experiment-platform/04-evaluation.md.

import { getHashFn } from "./hash";

export interface GateRule {
  attr: string;
  op: "eq" | "neq" | "in" | "not_in" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
  value: unknown;
}

export interface Gate {
  rules: GateRule[];
  rolloutPct: number; // 0–10000 basis points
  salt: string;
  enabled: 0 | 1 | boolean;
  hashVersion?: number;
}

export interface User {
  user_id?: string;
  anonymous_id?: string;
  [attr: string]: unknown;
}

function isEnabled(v: 0 | 1 | boolean | undefined): boolean {
  return v === 1 || v === true;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function matchRule(rule: GateRule, user: User): boolean {
  const actual = user[rule.attr];
  switch (rule.op) {
    case "eq":
      return actual === rule.value;
    case "neq":
      return actual !== rule.value;
    case "in":
      return Array.isArray(rule.value) && (rule.value as unknown[]).includes(actual as unknown);
    case "not_in":
      return Array.isArray(rule.value) && !(rule.value as unknown[]).includes(actual as unknown);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toNumber(actual);
      const b = toNumber(rule.value);
      if (a === null || b === null) return false;
      if (rule.op === "gt") return a > b;
      if (rule.op === "gte") return a >= b;
      if (rule.op === "lt") return a < b;
      return a <= b;
    }
    case "contains":
      if (typeof actual === "string" && typeof rule.value === "string") {
        return actual.includes(rule.value);
      }
      if (Array.isArray(actual)) return (actual as unknown[]).includes(rule.value);
      return false;
    case "regex":
      if (typeof actual !== "string" || typeof rule.value !== "string") return false;
      try {
        return new RegExp(rule.value).test(actual);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function evalGate(gate: Gate, user: User): boolean {
  if (!isEnabled(gate.enabled)) return false;

  for (const rule of gate.rules ?? []) {
    if (!matchRule(rule, user)) return false;
  }

  const uid = user.user_id ?? user.anonymous_id;
  if (!uid) return false;

  const hash = getHashFn(gate.hashVersion);
  const segment = hash(`${gate.salt}:${uid}`) % 10000;
  return segment < gate.rolloutPct;
}

// ── Gatekeeper (stacked) evaluation ────────────────────────────────────────
//
// A gatekeeper is a Gate with an ordered `stack` of sub-gates. Each sub-gate
// is either a condition (rules + ALL/ANY) or a rollout (% on a bucket key).
// The stack short-circuits on the first PASS; if every entry fails, the
// gatekeeper returns false. When `stack` is absent, behavior falls back to
// the legacy single-rule + rolloutPct evaluation.

export type StackedGateEntry =
  | {
      id: string;
      type: "condition";
      name?: string;
      fromTemplate?: string | null;
      pass?: "all" | "any";
      rules: GateRule[];
      locked?: boolean;
    }
  | {
      id: string;
      type: "rollout";
      name?: string;
      fromTemplate?: string | null;
      rolloutPct: number;
      bucketBy?: string;
      salt?: string;
      locked?: boolean;
    };

export interface Gatekeeper extends Gate {
  stack?: StackedGateEntry[] | null;
}

function pickIdentifier(user: User, bucketBy: string | undefined): string | undefined {
  if (bucketBy) {
    const v = user[bucketBy];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return user.user_id ?? user.anonymous_id;
}

function evalStackEntry(
  entry: StackedGateEntry,
  user: User,
  fallbackSalt: string,
  hashVersion: number | undefined,
): boolean {
  if (entry.type === "condition") {
    const rules = entry.rules ?? [];
    if (rules.length === 0) return false;
    const mode = entry.pass ?? "all";
    if (mode === "any") {
      for (const r of rules) if (matchRule(r, user)) return true;
      return false;
    }
    for (const r of rules) if (!matchRule(r, user)) return false;
    return true;
  }
  // rollout
  const pct = entry.rolloutPct ?? 0;
  if (pct <= 0) return false;
  const uid = pickIdentifier(user, entry.bucketBy);
  if (!uid) return false;
  if (pct >= 10000) return true;
  const salt = entry.salt && entry.salt.length > 0 ? entry.salt : fallbackSalt;
  const hash = getHashFn(hashVersion);
  return hash(`${salt}:${uid}`) % 10000 < pct;
}

export function evalGatekeeper(gate: Gatekeeper, user: User): boolean {
  if (!isEnabled(gate.enabled)) return false;
  const stack = gate.stack;
  if (!stack || stack.length === 0) return evalGate(gate, user);
  for (const entry of stack) {
    if (evalStackEntry(entry, user, gate.salt, gate.hashVersion)) return true;
  }
  return false;
}
