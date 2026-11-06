
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const backendUrl = (
    process.env.BACKEND_URL || "http://localhost:3002"
  ).replace(/\/+$/, "");

  const { path } = await context.params;

  const safePath = path.map((segment) =>
    encodeURIComponent(segment),
  ).join("/");

  const targetUrl = new URL(
    `${backendUrl}/${safePath}`,
  );

  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();

  // Forward only headers required by the backend.
  const forwardedHeaders = [
    "accept",
    "content-type",
    "authorization",
    "cookie",
    "x-request-id",
  ];

  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  const method = request.method;

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers();

    // Return relevant response headers to the browser.
    const responseHeaderNames = [
      "content-type",
      "content-disposition",
      "cache-control",
      "location",
      "vary",
    ];

    for (const name of responseHeaderNames) {
      const value = upstream.headers.get(name);

      if (value) {
        responseHeaders.set(name, value);
      }
    }

    // Preserve Set-Cookie headers, including the authentication cookie.
    const getSetCookie = (
      upstream.headers as Headers & {
        getSetCookie?: () => string[];
      }
    ).getSetCookie;

    const cookies = getSetCookie
      ? getSetCookie.call(upstream.headers)
      : [];

    if (cookies.length > 0) {
      for (const cookie of cookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const cookie = upstream.headers.get("set-cookie");

      if (cookie) {
        responseHeaders.append("set-cookie", cookie);
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy error:", error);

    return NextResponse.json(
      {
        statusCode: 502,
        message: "Backend service is unavailable.",
      },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
