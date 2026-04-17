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
  session: { strategy: "jwt", maxAge: 15 * 60 },
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
