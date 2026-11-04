// The backend API's base URL, computed once per page load.
//
// NEXT_PUBLIC_API_URL overrides this outright when set (useful if the
// backend ever runs on a different host/port than the frontend) — see
// .env.example. Left unset by default: the frontend and backend always
// run on the same machine here (just ports 3001 vs 3012), so deriving
// the backend's address from whatever host the browser used to load
// THIS page means the app keeps working automatically across
// localhost, a LAN IP, or a public IP that changes with the network —
// without editing an env file and restarting every time it does.
function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3002`;
  }

  // Server-side (SSR) fallback — none of this file's callers actually
  // render a URL during SSR (all fetches run client-side in useEffect),
  // so this value is never user-visible; it only needs to not throw.
  return "http://localhost:3012";
}

export const API_URL = resolveApiUrl();
