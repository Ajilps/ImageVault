import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { getValidBackendAccessToken } from "@/lib/backend-auth";

const PUBLIC_BACKEND_PATHS = [/^api\/config\/public$/, /^api\/public\/images\/[^/]+$/];

function backendUrl(): string {
  const value = process.env.API_URL;
  if (!value) throw new Error("API_URL must be configured.");
  return value.replace(/\/$/, "");
}

function authenticationError(): Response {
  return Response.json(
    { error: { code: "INVALID_TOKEN", message: "Your session has expired. Please sign in again." } },
    { status: 401 },
  );
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const backendPath = path.map(encodeURIComponent).join("/");
  const isPublicPath = PUBLIC_BACKEND_PATHS.some((pattern) => pattern.test(backendPath));
  const sessionToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = getValidBackendAccessToken(sessionToken);

  if (!isPublicPath && !accessToken) {
    return authenticationError();
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("Content-Type", contentType);
  if (accept) headers.set("Accept", accept);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}/${backendPath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: { code: "BACKEND_UNAVAILABLE", message: "The application service could not be reached." } },
      { status: 502 },
    );
  }

  if (!isPublicPath && upstream.status === 401) {
    return authenticationError();
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const dynamic = "force-dynamic";
export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
