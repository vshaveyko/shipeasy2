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
    async jwt({ token, user }) {
      if (user) token.id = user.id;

      const email = (token.email as string | undefined) ?? (user?.email as string | undefined);
      if (email && !token.project_id) {
        const env = await getEnvAsync();
        // Auto-accept any pending invitations for this email so the user
        // shows up in `listAccessibleProjects` immediately. Without this,
        // invited team members would land here with no membership row in
        // `active` state and we'd auto-create a brand-new empty project for
        // them — exactly the bug being fixed.
        await acceptPendingInvitesForEmail(env.DB, email);
        const accessible = await listAccessibleProjects(env.DB, email);
        if (accessible.length > 0) {
          token.project_id = accessible[0].id;
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
