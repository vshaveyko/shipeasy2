import { describe, it, expect, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: {} }),
  initOpenNextCloudflareForDev: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "test@example.com", project_id: "proj" } }),
}));

import { GET } from "../route";

describe("GET /admin/plans", () => {
  it("returns the plans record with at least a free plan", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, { name: string }>;
    expect(typeof body).toBe("object");
    expect("free" in body).toBe(true);
    expect(body.free.name).toBe("free");
  });
});
