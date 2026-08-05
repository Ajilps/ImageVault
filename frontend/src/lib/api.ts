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

const API_PREFIX = "/api/backend";

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
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
    const isAuthenticationFailure =
      response.status === 401 &&
      (data.error?.code === "INVALID_TOKEN" || data.error?.code === "AUTHENTICATION_REQUIRED");
    if (isAuthenticationFailure && typeof window !== "undefined") {
      window.dispatchEvent(new Event("imagevault:authentication-expired"));
    }
    throw new ApiError(data.error?.message ?? "The request could not be completed.", response.status, data.error?.code);
  }

  return data as T;
}

export const api = {
  publicConfig: () => request<{ config: PublicConfig }>("/api/config/public", { cache: "no-store" }),
  me: () => request<{ user: CurrentUser }>("/api/auth/me"),

  changeOwnPassword: (input: { currentPassword: string; newPassword: string }) =>
    request<void>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  organisations: () => request<{ organisations: Organisation[] }>("/api/organisations"),

  createOrganisation: (
    input: {
      name: string;
      logoUrl?: string;
      address: string;
      phone: string;
      admin: { name: string; email: string };
    },
  ) =>
    request<{ organisation: Organisation; temporaryPassword: string }>("/api/organisations", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateOrganisation: (
    organisationId: string,
    input: { name?: string; logoUrl?: string; address?: string; phone?: string },
  ) =>
    request<{ organisation: Organisation }>(`/api/organisations/${organisationId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteOrganisation: (organisationId: string) =>
    request<void>(`/api/organisations/${organisationId}`, { method: "DELETE" }),

  resetOrganisationAdminPassword: (organisationId: string, newPassword: string) =>
    request<{ admin: Organisation["admin"] }>(`/api/organisations/${organisationId}/admin/password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword }),
    }),

  users: () => request<{ users: ManagedUser[] }>("/api/users"),

  members: () => request<{ users: ManagedUser[] }>("/api/members"),

  createUser: (input: { name: string; email: string }) =>
    request<{ user: ManagedUser; temporaryPassword: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateUser: (userId: string, input: { name?: string; email?: string; password?: string }) =>
    request<{ user: ManagedUser }>(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteUser: (userId: string) => request<void>(`/api/users/${userId}`, { method: "DELETE" }),

  allocateUserSlots: (userId: string, additionalSlots: number) =>
    request<{ user: ManagedUser }>(`/api/users/${userId}/slots`, {
      method: "POST",
      body: JSON.stringify({ additionalSlots }),
    }),

  images: (taggedUserId?: string) =>
    request<{ images: ImageRecord[] }>(
      `/api/images${taggedUserId ? `?taggedUserId=${encodeURIComponent(taggedUserId)}` : ""}`,
      {},
    ),

  quota: () => request<{ quota: Quota }>("/api/quota"),

  createUploadUrl: (input: { fileName: string; contentType: string }) =>
    request<{ upload: { objectKey: string; uploadUrl: string; expiresIn: number; maxFileSize: number } }>(
      "/api/images/upload-url",
      { method: "POST", body: JSON.stringify(input) },
    ),

  completeUpload: (input: { objectKey: string; tagUserIds: string[]; visibility: "PUBLIC" | "PRIVATE" }) =>
    request<{ image: ImageRecord }>("/api/images", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createImageShare: (imageId: string) =>
    request<{ share: { shareToken: string } }>(`/api/images/${imageId}/share`, {
      method: "POST",
    }),

  revokeImageShare: (imageId: string) =>
    request<void>(`/api/images/${imageId}/share`, {
      method: "DELETE",
    }),

  publicSharedImage: (shareToken: string) =>
    request<{ image: PublicSharedImage }>(`/api/public/images/${encodeURIComponent(shareToken)}`, {
      cache: "no-store",
    }),

  notifications: () => request<{ notifications: Notification[] }>("/api/notifications"),

  clearNotification: (notificationId: string) =>
    request<void>(`/api/notifications/${notificationId}`, { method: "DELETE" }),

  payments: () => request<{ payments: Payment[] }>("/api/payments"),

  createPaymentOrder: (slotPacks: number) =>
    request<{ order: { orderId: string; amount: number; currency: string; keyId: string; slotsPurchased: number } }>(
      "/api/payments/orders",
      { method: "POST", body: JSON.stringify({ slotPacks }) },
    ),

  verifyPayment: (input: { orderId: string; paymentId: string; signature: string }) =>
    request<{ payment: Payment }>("/api/payments/verify", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  subscribePush: (input: PushSubscriptionInput) =>
    request<{ subscription: { id: string } }>("/api/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  unsubscribePush: (endpoint: string) =>
    request<void>("/api/push/subscriptions", {
      method: "DELETE",
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
