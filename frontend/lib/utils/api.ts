
// Browser requests use the same-origin Next.js API proxy.
// Server-side requests use the backend's internal URL.

function resolveApiUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  return (
    process.env.BACKEND_URL?.replace(/\/+$/, "") ||
    "http://localhost:3002"
  );
}

export const API_URL = resolveApiUrl();
