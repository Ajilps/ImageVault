import type { DefaultSession } from "next-auth";

import type { CurrentUser } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: CurrentUser & DefaultSession["user"];
    backendAccessTokenExpiresAt?: number;
    authError?: "BACKEND_TOKEN_EXPIRED";
  }

  interface User extends CurrentUser {
    backendAccessToken: string;
    backendAccessTokenExpiresAt: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendAccessToken?: string;
    backendAccessTokenExpiresAt?: number;
    imageVaultUser?: CurrentUser;
  }
}
