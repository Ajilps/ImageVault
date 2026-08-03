import type {
  CurrentUser,
  ImageRecord,
  ManagedUser,
  Notification,
  Organisation,
  Payment,
  Quota,
  PublicConfig,
  PublicSharedImage,
  PushSubscriptionInput,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL must be configured.");
}

type RequestOptions = RequestInit & { token?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  };

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("imagevault:authentication-expired"));
    }
    throw new ApiError(data.error?.message ?? "The request could not be completed.", response.status, data.error?.code);
  }

  return data as T;
}

export const api = {
  publicConfig: () => request<{ config: PublicConfig }>("/api/config/public", { cache: "no-store" }),
  login: (input: { email: string; password: string }) =>
    request<{ user: CurrentUser; accessToken: string; accessTokenExpiresAt: number }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: (token: string) => request<{ user: CurrentUser }>("/api/auth/me", { token }),

  changeOwnPassword: (token: string, input: { currentPassword: string; newPassword: string }) =>
    request<void>("/api/auth/password", {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    }),

  organisations: (token: string) => request<{ organisations: Organisation[] }>("/api/organisations", { token }),

  createOrganisation: (
    token: string,
    input: {
      name: string;
      logoUrl: string;
      address: string;
      phone: string;
      admin: { name: string; email: string };
    },
  ) =>
    request<{ organisation: Organisation }>("/api/organisations", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  updateOrganisation: (
    token: string,
    organisationId: string,
    input: { name?: string; logoUrl?: string; address?: string; phone?: string },
  ) =>
    request<{ organisation: Organisation }>(`/api/organisations/${organisationId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    }),

  deleteOrganisation: (token: string, organisationId: string) =>
    request<void>(`/api/organisations/${organisationId}`, { method: "DELETE", token }),

  resetOrganisationAdminPassword: (token: string, organisationId: string, newPassword: string) =>
    request<{ admin: Organisation["admin"] }>(`/api/organisations/${organisationId}/admin/password`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ newPassword }),
    }),

  users: (token: string) => request<{ users: ManagedUser[] }>("/api/users", { token }),

  members: (token: string) => request<{ users: ManagedUser[] }>("/api/members", { token }),

  createUser: (token: string, input: { name: string; email: string }) =>
    request<{ user: ManagedUser }>("/api/users", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  updateUser: (token: string, userId: string, input: { name?: string; email?: string; password?: string }) =>
    request<{ user: ManagedUser }>(`/api/users/${userId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    }),

  deleteUser: (token: string, userId: string) => request<void>(`/api/users/${userId}`, { method: "DELETE", token }),

  allocateUserSlots: (token: string, userId: string, additionalSlots: number) =>
    request<{ user: ManagedUser }>(`/api/users/${userId}/slots`, {
      method: "POST",
      token,
      body: JSON.stringify({ additionalSlots }),
    }),

  images: (token: string, taggedUserId?: string) =>
    request<{ images: ImageRecord[] }>(
      `/api/images${taggedUserId ? `?taggedUserId=${encodeURIComponent(taggedUserId)}` : ""}`,
      { token },
    ),

  quota: (token: string) => request<{ quota: Quota }>("/api/quota", { token }),

  createUploadUrl: (token: string, input: { fileName: string; contentType: string }) =>
    request<{ upload: { objectKey: string; uploadUrl: string; expiresIn: number; maxFileSize: number } }>(
      "/api/images/upload-url",
      { method: "POST", token, body: JSON.stringify(input) },
    ),

  completeUpload: (token: string, input: { objectKey: string; tagUserIds: string[]; visibility: "PUBLIC" | "PRIVATE" }) =>
    request<{ image: ImageRecord }>("/api/images", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  createImageShare: (token: string, imageId: string) =>
    request<{ share: { shareToken: string } }>(`/api/images/${imageId}/share`, {
      method: "POST",
      token,
    }),

  revokeImageShare: (token: string, imageId: string) =>
    request<void>(`/api/images/${imageId}/share`, {
      method: "DELETE",
      token,
    }),

  publicSharedImage: (shareToken: string) =>
    request<{ image: PublicSharedImage }>(`/api/public/images/${encodeURIComponent(shareToken)}`, {
      cache: "no-store",
    }),

  notifications: (token: string) => request<{ notifications: Notification[] }>("/api/notifications", { token }),

  payments: (token: string) => request<{ payments: Payment[] }>("/api/payments", { token }),

  createPaymentOrder: (token: string, slotPacks: number) =>
    request<{ order: { orderId: string; amount: number; currency: string; keyId: string; slotsPurchased: number } }>(
      "/api/payments/orders",
      { method: "POST", token, body: JSON.stringify({ slotPacks }) },
    ),

  verifyPayment: (token: string, input: { orderId: string; paymentId: string; signature: string }) =>
    request<{ payment: Payment }>("/api/payments/verify", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  subscribePush: (token: string, input: PushSubscriptionInput) =>
    request<{ subscription: { id: string } }>("/api/push/subscriptions", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  unsubscribePush: (token: string, endpoint: string) =>
    request<void>("/api/push/subscriptions", {
      method: "DELETE",
      token,
      body: JSON.stringify({ endpoint }),
    }),
};

export async function uploadFile(uploadUrl: string, file: File): Promise<void> {
  let response: Response;

  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new ApiError(
      "The browser could not reach image storage. Check the storage endpoint and bucket CORS configuration.",
      0,
      "STORAGE_UNREACHABLE",
    );
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? "The image storage bucket was not found. Ask an administrator to run the storage setup."
        : response.status === 403
          ? "Image storage rejected the upload. Check the signed URL, credentials, and bucket CORS configuration."
          : "The image could not be uploaded to storage.";
    throw new ApiError(message, response.status, "STORAGE_UPLOAD_FAILED");
  }
}
