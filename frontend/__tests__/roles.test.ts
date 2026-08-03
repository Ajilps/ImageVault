import { canAccessRoute, homeForRole, roleLabel, routeRoles } from "@/lib/roles";

describe("role routing", () => {
  it.each([
    ["PRODUCT_OWNER", "/organisations"],
    ["ADMIN", "/users"],
    ["USER", "/gallery"],
  ] as const)("sends %s to %s", (role, destination) => {
    expect(homeForRole(role)).toBe(destination);
  });

  it("formats role labels for the dashboard", () => {
    expect(roleLabel("PRODUCT_OWNER")).toBe("Product Owner");
  });

  it.each([
    ["PRODUCT_OWNER", "/organisations", true],
    ["PRODUCT_OWNER", "/users", false],
    ["PRODUCT_OWNER", "/gallery", false],
    ["ADMIN", "/users", true],
    ["ADMIN", "/gallery", true],
    ["ADMIN", "/notifications", true],
    ["ADMIN", "/upload", false],
    ["ADMIN", "/payments", false],
    ["USER", "/gallery", true],
    ["USER", "/upload", true],
    ["USER", "/payments", true],
    ["USER", "/notifications", true],
    ["USER", "/users", false],
  ] as const)("validates %s access to %s", (role, path, expected) => {
    expect(canAccessRoute(role, path)).toBe(expected);
  });

  it("allows every authenticated role to view its profile and denies unknown protected routes", () => {
    for (const role of ["PRODUCT_OWNER", "ADMIN", "USER"] as const) {
      expect(canAccessRoute(role, "/profile")).toBe(true);
      expect(canAccessRoute(role, "/unknown")).toBe(false);
    }
    expect(Object.keys(routeRoles).sort()).toEqual([
      "/gallery", "/notifications", "/organisations", "/payments", "/profile", "/upload", "/users",
    ]);
  });
});
