import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import type { CurrentUser } from "@/lib/types";

type LoginResponse = {
  user: CurrentUser;
  accessToken: string;
  accessTokenExpiresAt: number;
};

function backendUrl() {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value) throw new Error("NEXT_PUBLIC_API_URL must be configured.");
  return value.replace(/\/$/, "");
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "ImageVault credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        try {
          const response = await fetch(`${backendUrl()}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
          });

          if (!response.ok) {
            return null;
          }

          const result = (await response.json()) as LoginResponse;

          return {
            ...result.user,
            backendAccessToken: result.accessToken,
            backendAccessTokenExpiresAt: result.accessTokenExpiresAt,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // The credentials provider returns the full backend user. NextAuth's
        // base User type keeps name and email optional, so narrow it here.
        const authenticatedUser = user as CurrentUser & { backendAccessToken: string; backendAccessTokenExpiresAt: number };

        token.backendAccessToken = authenticatedUser.backendAccessToken;
        token.backendAccessTokenExpiresAt = authenticatedUser.backendAccessTokenExpiresAt;
        token.imageVaultUser = {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          role: authenticatedUser.role,
          imageQuota: authenticatedUser.imageQuota,
          organizationId: authenticatedUser.organizationId,
          organization: authenticatedUser.organization,
          createdAt: authenticatedUser.createdAt,
        };
      }

      return token;
    },
    session({ session, token }) {
      const isBackendTokenValid = typeof token.backendAccessTokenExpiresAt === "number" && token.backendAccessTokenExpiresAt > Date.now();
      if (token.backendAccessToken && token.imageVaultUser && isBackendTokenValid) {
        session.backendAccessToken = token.backendAccessToken;
        session.user = token.imageVaultUser;
        session.authError = undefined;
      } else if (token.imageVaultUser) {
        session.authError = "BACKEND_TOKEN_EXPIRED";
      }

      return session;
    },
  },
};
