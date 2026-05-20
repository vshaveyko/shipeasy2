// Internal dogfooding: emit shipeasy events from admin actions so we measure our own
// product surface with the same metric pipeline we sell. Wired at admin creation paths
// (gate / config / experiment / metric / killswitch) and a few status flips.
//
// Events use the `admin_` prefix and are pre-registered by POST /api/admin/dogfood/seed
// against the project that hosts the dogfood SDK keys (the one wired into apps/ui's
// root layout via SHIPEASY_SERVER_KEY).

import { flags } from "@shipeasy/sdk/server";

export const DOGFOOD_EVENTS = {
  loginSucceeded: "admin_login_succeeded",
  gateCreated: "admin_gate_created",
  configCreated: "admin_config_created",
  configPublished: "admin_config_published",
  experimentCreated: "admin_experiment_created",
  experimentStarted: "admin_experiment_started",
  experimentStopped: "admin_experiment_stopped",
  metricCreated: "admin_metric_created",
  killswitchCreated: "admin_killswitch_created",
  killswitchToggled: "admin_killswitch_toggled",
} as const;

export type DogfoodEvent = (typeof DOGFOOD_EVENTS)[keyof typeof DOGFOOD_EVENTS];

export function dogfoodTrack(
  userId: string,
  event: DogfoodEvent,
  props?: Record<string, unknown>,
): void {
  // flags.track is a no-op when the server SDK hasn't been configured (e.g. local dev
  // without SHIPEASY_SERVER_KEY). Wrap defensively — admin actions should never fail
  // because internal telemetry hit a hiccup.
  try {
    flags.track(userId || "anonymous", event, props);
  } catch (err) {
    console.warn(JSON.stringify({ event: "dogfood_track_failed", name: event, err: String(err) }));
  }
}
