declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: string;
        role: "ADMIN" | "PRODUCT_OWNER" | "USER";
        organizationId: string | null;
      };
      validatedQuery?: unknown;
    }
  }
}

export {};
