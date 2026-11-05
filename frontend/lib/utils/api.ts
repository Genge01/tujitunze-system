
// The backend API's base URL, computed once per page load.
//
// NEXT_PUBLIC_API_URL overrides the default when configured.
// Otherwise, browser requests use the current hostname on port 3002.

function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3002`;
  }

  // Server-side fallback.
  return "http://localhost:3002";
}

export const API_URL = resolveApiUrl();
