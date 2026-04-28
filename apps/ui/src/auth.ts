import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { findProjectByEmail, insertProject } from "@shipeasy/core";
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
        const existing = await findProjectByEmail(env.DB, email);
        if (existing) {
          token.project_id = existing.id;
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
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.project_id) session.user.project_id = token.project_id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
