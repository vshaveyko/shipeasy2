/**
 * AI report processor (STUB).
 *
 * Wired into the bug + feature-request create paths *before* the DB insert.
 * The processor is meant to (a) rewrite the user's free-text into a clearer
 * report and (b) flag duplicates against the project's existing reports.
 *
 * Today this is a deterministic pass-through so the surrounding code can be
 * built and tested. Replace `processReport` with a real LLM call (Claude
 * via `@anthropic-ai/sdk`) once the prompts are stabilised.
 *
 * Replacement plan (sketch):
 *   1. Pull the last N reports of the same kind for the project (title +
 *      reporterEmail + createdAt).
 *   2. Send: { kind, raw input, recent_reports } to Claude with a system
 *      prompt that asks for { improved: {...}, duplicate_of?: id, similar:
 *      [id...], notes }.
 *   3. Cache results by content hash so retries don't re-bill.
 */

import type { BugCreateInput, FeatureRequestCreateInput } from "@shipeasy/core/schemas/feedback";

export type ProcessedBug = {
  improved: BugCreateInput;
  duplicateOf: string | null;
  similar: string[];
  notes: string;
};

export type ProcessedFeatureRequest = {
  improved: FeatureRequestCreateInput;
  duplicateOf: string | null;
  similar: string[];
  notes: string;
};

export type ProcessReportContext = {
  projectId: string;
  recentReports?: { id: string; title: string }[];
};

export async function processBugReport(
  raw: BugCreateInput,
  ctx: ProcessReportContext,
): Promise<ProcessedBug> {
  // STUB: identity transform. Replace with a Claude call.
  return {
    improved: raw,
    duplicateOf: null,
    similar: [],
    notes: `ai-processor:stub project=${ctx.projectId}`,
  };
}

export async function processFeatureRequest(
  raw: FeatureRequestCreateInput,
  ctx: ProcessReportContext,
): Promise<ProcessedFeatureRequest> {
  return {
    improved: raw,
    duplicateOf: null,
    similar: [],
    notes: `ai-processor:stub project=${ctx.projectId}`,
  };
}
