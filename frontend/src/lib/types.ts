export type UserRole = "ADMIN" | "PRODUCT_OWNER" | "USER";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  imageQuota: number;
  organizationId: string | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
};

export type Organisation = {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  adminId: string;
  admin: { id: string; name: string; email: string; role: UserRole; createdAt: string };
  createdAt: string;
  _count: { users: number; images: number };
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  imageQuota: number;
  organizationId: string | null;
  createdAt: string;
  _count?: { uploads: number };
};

export type ImageRecord = {
  id: string;
  url: string;
  objectKey: string;
  createdAt: string;
  downloadUrl: string;
  visibility: "PUBLIC" | "PRIVATE";
  shareToken: string | null;
  uploadedBy: { id: string; name: string; email: string };
  tags: Array<{ id: string; name: string; email: string }>;
};

export type PublicSharedImage = {
  id: string;
  createdAt: string;
  visibility: "PUBLIC";
  downloadUrl: string;
  uploadedBy: { id: string; name: string; email: string };
};

export type Notification = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; name: string };
  image: { id: string; objectKey: string; downloadUrl: string };
};

export type Payment = {
  id: string;
  amount: number;
  slotsPurchased: number;
  transactionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
};

export type Quota = {
  total: number;
  used: number;
  remaining: number;
};

export type PublicConfig = {
  defaultImageQuota: number;
  slotPackSize: number;
  slotPackPriceInr: number;
  maxSlotPacksPerOrder: number;
  maxAdminSlotAllocation: number;
  maxUserImageQuota: number;
  maxTagsPerImage: number;
  maxFileSize: number;
  notificationPollIntervalMs: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  pushEnabled: boolean;
  vapidPublicKey: string | null;
};

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};
