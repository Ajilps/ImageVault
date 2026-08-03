import type { UserRole } from "@/lib/types";

export const routeRoles: Record<string, readonly UserRole[]> = {
  "/organisations": ["PRODUCT_OWNER"],
  "/users": ["ADMIN"],
  "/gallery": ["ADMIN", "USER"],
  "/upload": ["USER"],
  "/payments": ["USER"],
  "/notifications": ["ADMIN", "USER"],
  "/profile": ["PRODUCT_OWNER", "ADMIN", "USER"],
};

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  return routeRoles[pathname]?.includes(role) ?? false;
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "PRODUCT_OWNER":
      return "/organisations";
    case "ADMIN":
      return "/users";
    default:
      return "/gallery";
  }
}

export function roleLabel(role: UserRole): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
