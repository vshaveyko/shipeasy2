import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import {
  acceptPendingInvitesForEmail,
  findProjectById,
  hasProjectAccess,
  insertProject,
  listAccessibleProjects,
} from "@shipeasy/core";
import { getEnvAsync } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      project_id?: string;
    };
  }
  interface User {
    project_id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    project_id?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  /*
    A stale auth.js session cookie (e.g. left over from a prior AUTH_SECRET)
    surfaces as a recurring JWTSessionError on every server render. The
    session is already null when this happens, so the user-facing behavior
    is just "you're not logged in" — but the noisy stack trace fills the
    console and the Next dev overlay. Demote it to a debug log; the cookie
    self-heals on the next sign-in.
  */
  logger: {
    error(error) {
      const code = (error as { type?: string; message?: string })?.type ?? "";
      const msg = (error as { message?: string })?.message ?? "";
      if (code === "JWTSessionError" || msg.includes("no matching decryption secret")) return;
      // eslint-disable-next-line no-console
      console.error("[auth]", error);
    },
    warn() {},
    debug() {},
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;

      const rawEmail = (token.email as string | undefined) ?? (user?.email as string | undefined);
      // Membership rows are stored lowercased (`normalizeEmail` in
      // handlers/members.ts). OAuth providers can return mixed-case emails;
      // SQLite text equality is case-sensitive, so without this the pending
      // invitation wouldn't match and the new member would stay locked out.
      const email = rawEmail?.trim().toLowerCase();
      if (!email) return token;

      // A fresh sign-in (NextAuth passes a `user`) or an explicit
      // `update()` call. We don't want to hit D1 on every JWT decode, but
      // we MUST run accept-pending on every sign-in — even returning users
      // whose token already has a `project_id` from a prior login. Without
      // this, anyone invited *after* their first login stays stuck in the
      // `pending` membership state forever.
      const isSignIn = !!user || trigger === "signIn" || trigger === "signUp";
      if (isSignIn) {
        // Dogfood: emit our own admin_login_succeeded so dashboard metrics see real
        // traffic. Lazy-imported because @/lib/dogfood imports the shipeasy SDK which
        // would inflate the auth bundle on every route.
        try {
          const { dogfoodTrack, DOGFOOD_EVENTS } = await import("@/lib/dogfood");
          dogfoodTrack(email, DOGFOOD_EVENTS.loginSucceeded);
        } catch {
          /* never block auth on telemetry */
        }
        const env = await getEnvAsync();
        const accepted = await acceptPendingInvitesForEmail(env.DB, email);
        // Re-resolve project_id when:
        //   1. the token has none yet (first login), or
        //   2. we just accepted invites — the user probably wants to land on
        //      the project they were invited to, not the empty auto-created
        //      one bound earlier.
        if (!token.project_id || accepted > 0) {
          const accessible = await listAccessibleProjects(env.DB, email);
          if (accessible.length > 0) {
            // Prefer the most-recently-accepted membership project: it's
            // appended last in `listAccessibleProjects` (member rows after
            // owned). Fall back to whatever's first.
            const memberProject = accessible[accessible.length - 1];
            token.project_id = accepted > 0 && memberProject ? memberProject.id : accessible[0].id;
          } else {
            const now = new Date().toISOString();
            const id = crypto.randomUUID();
            await insertProject(env.DB, {
              id,
              name: email.split("@")[0],
              ownerEmail: email,
              plan: "free",
              status: "active",
              createdAt: now,
              updatedAt: now,
            });
            token.project_id = id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      // Honour the `active_project_id` cookie set by the dashboard's project
      // switcher. Without this every page that reads session.user.project_id
      // (40+ files) would stay pinned to the JWT's original project even after
      // the user switched. Cookie is httpOnly + only set by server actions
      // that already validate ownership, but we still revalidate against D1
      // here in case the project was deleted or ownership changed.
      let projectId = token.project_id;
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const cookieProjectId = cookieStore.get("active_project_id")?.value;
        const email = session.user.email ?? null;
        if (cookieProjectId && cookieProjectId !== projectId && email) {
          const env = await getEnvAsync();
          const proj = await findProjectById(env.DB, cookieProjectId);
          // Honor the cookie if the user owns the project OR is an active
          // member — otherwise team members would silently get bumped back
          // to the JWT's auto-created project on every navigation.
          if (proj && (await hasProjectAccess(env.DB, proj.id, email))) {
            projectId = cookieProjectId;
          }
        }
      } catch {
        // Not in a request scope (e.g., during build) — fall back to JWT.
      }
      if (projectId) session.user.project_id = projectId;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
