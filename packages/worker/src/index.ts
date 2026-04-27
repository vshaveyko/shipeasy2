// Shipeasy edge worker — SDK hot path, CLI device auth, analysis cron + queue.
// See experiment-platform/03-worker-endpoints.md for the authoritative contract.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { deviceComplete, devicePoll, deviceStart } from "./auth/device";
import { runArchival } from "./analysis/archival";
import { runAnalysisCron } from "./analysis/cron";
import { consumeAnalysis } from "./analysis/consumer";
import { runPurgeRetry } from "./analysis/purge-retry";
import { runRetentionPurge } from "./analysis/retention";
import { requireKey, type AuthedContext } from "./lib/auth";
import { openApiSpec } from "./openapi";
import { handleBootstrap } from "./sdk/bootstrap";
import { handleCollect } from "./sdk/collect";
import { handleEvaluate } from "./sdk/evaluate";
import { handleExperiments } from "./sdk/experiments";
import { handleFlags } from "./sdk/flags";
import type { AnalysisMessage, WorkerEnv } from "./env";

type HonoEnv = { Bindings: WorkerEnv; Variables: { key: import("@shipeasy/core").SdkKeyMeta } };

const app = new Hono<HonoEnv>();

// ── CORS (first middleware, before auth) ─────────────────────────────────────
app.use(
  "/sdk/*",
  cors({
    origin: "*",
    allowHeaders: ["X-SDK-Key", "Authorization", "Content-Type", "X-User-Context", "If-None-Match"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["ETag", "X-Poll-Interval"],
    maxAge: 86400,
  }),
);
app.use(
  "/collect",
  cors({
    origin: "*",
    allowHeaders: ["X-SDK-Key", "Authorization", "Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
    maxAge: 86400,
  }),
);
app.use(
  "/auth/*",
  cors({
    origin: "*",
    allowHeaders: ["X-SDK-Key", "X-Code-Verifier", "X-Service-Key", "Content-Type"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    maxAge: 3600,
  }),
);

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/", (c) => c.text("ShipEasy Worker"));
app.get("/healthz", (c) => c.json({ ok: true }));

// ── OpenAPI spec (public, served with permissive CORS for codegen tools) ─────
app.get("/openapi.json", (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Cache-Control", "public, max-age=300");
  return c.json(openApiSpec);
});

// ── SDK endpoints ────────────────────────────────────────────────────────────
app.get("/sdk/flags", requireKey("server"), (c) => handleFlags(c as AuthedContext));
app.get("/sdk/experiments", requireKey("server"), (c) => handleExperiments(c as AuthedContext));
app.post("/sdk/evaluate", requireKey("client"), (c) => handleEvaluate(c as AuthedContext));
app.get("/sdk/bootstrap", requireKey("server"), (c) => handleBootstrap(c as AuthedContext));
app.post("/collect", requireKey("client"), (c) => handleCollect(c as AuthedContext));

// ── CLI device auth ──────────────────────────────────────────────────────────
app.post("/auth/device/start", (c) => deviceStart(c));
app.post("/auth/device/complete", (c) => deviceComplete(c));
app.get("/auth/device/poll", (c) => devicePoll(c));

// ── Error handler: surface ApiError status codes ─────────────────────────────
app.onError((err, c) => {
  const anyErr = err as { status?: number; message?: string };
  if (typeof anyErr.status === "number") {
    return c.json({ error: anyErr.message ?? "Error" }, anyErr.status as 400);
  }
  console.error(
    JSON.stringify({
      event: "unhandled_error",
      path: c.req.path,
      error: String(err),
    }),
  );
  return c.text("Internal Server Error", 500);
});

// ── Scheduled (cron) + Queue dispatchers ─────────────────────────────────────
export default {
  fetch: app.fetch,

  async scheduled(
    event: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cron = event.cron;
    // Map cron expressions (from wrangler.toml triggers) to handlers.
    switch (cron) {
      case "0 2 * * *":
        ctx.waitUntil(runAnalysisCron(env));
        return;
      case "0 3 * * *":
        ctx.waitUntil(runRetentionPurge(env));
        return;
      case "0 4 * * *":
        ctx.waitUntil(runArchival(env));
        return;
      case "*/5 * * * *":
        ctx.waitUntil(runPurgeRetry(env));
        return;
      default:
        console.warn(JSON.stringify({ event: "unknown_cron", cron }));
    }
  },

  async queue(batch: MessageBatch<unknown>, env: WorkerEnv): Promise<void> {
    if (batch.queue === "experiment-analysis") {
      await consumeAnalysis(batch as MessageBatch<AnalysisMessage>, env);
      return;
    }
    if (batch.queue === "experiment-analysis-dlq") {
      for (const m of batch.messages) {
        console.error(
          JSON.stringify({
            event: "analysis_dlq_message",
            body: m.body,
            attempts: m.attempts,
          }),
        );
        m.ack();
      }
      return;
    }
    if (batch.queue === "i18n-usage" || batch.queue === "i18n-usage-dlq") {
      // Consumer not yet implemented (i18n rollup lands in string-manager phase 6).
      // Ack to prevent infinite retries; messages are AE-backed anyway.
      for (const m of batch.messages) {
        console.log(
          JSON.stringify({ event: "i18n_queue_stub_ack", queue: batch.queue, body: m.body }),
        );
        m.ack();
      }
      return;
    }
    for (const m of batch.messages) m.retry();
  },
};
