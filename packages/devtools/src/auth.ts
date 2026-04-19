import type { DevtoolsOptions, DevtoolsSession } from "./types";

const SESSION_KEY = "se_dt_session";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256b64url(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return b64url(new Uint8Array(digest));
}

function randomVerifier(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function loadSession(): DevtoolsSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as DevtoolsSession;
  } catch {}
  return null;
}

export function saveSession(s: DevtoolsSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function startDeviceAuth(
  opts: Required<DevtoolsOptions>,
  onWaiting: () => void,
): Promise<DevtoolsSession> {
  const verifier = randomVerifier();
  const challenge = await sha256b64url(verifier);

  const startRes = await fetch(`${opts.edgeUrl}/auth/device/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code_challenge: challenge }),
  });
  if (!startRes.ok) throw new Error("Failed to start device auth");
  const { state } = (await startRes.json()) as { state: string };

  window.open(
    `${opts.adminUrl}/cli-auth?state=${encodeURIComponent(state)}`,
    "_blank",
    "width=620,height=700,noopener",
  );
  onWaiting();

  return poll(opts, state, verifier);
}

async function poll(
  opts: Required<DevtoolsOptions>,
  state: string,
  verifier: string,
): Promise<DevtoolsSession> {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const res = await fetch(`${opts.edgeUrl}/auth/device/poll?state=${encodeURIComponent(state)}`, {
      headers: { "X-Code-Verifier": verifier },
    });
    if (res.status === 202) continue;
    if (res.status === 200) {
      const data = (await res.json()) as { token: string; project_id: string };
      const session: DevtoolsSession = { token: data.token, projectId: data.project_id };
      saveSession(session);
      return session;
    }
    throw new Error(`Device auth failed with status ${res.status}`);
  }
  throw new Error("Device auth timed out after 10 minutes");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
