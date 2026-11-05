
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import StatusBadge from "@/components/common/StatusBadge";
import { getAccessToken } from "@/lib/utils/permissions";
import { API_URL } from "@/lib/utils/api";

export type InstitutionType =
| "banks"
| "telecom-operators"
| "insurance-providers";

interface Institution {
  id: number;
  name: string;
  status: string;
  bankCode?: string | null;
  swiftCode?: string | null;
  countryCode?: string | null;
  licenseNumber?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  hasApiEndpoint?: boolean;
  hasApiCredentials?: boolean;
  hasWebhook?: boolean;
}

interface InstitutionResponse {
  data: Institution[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface InstitutionListPageProps {
  type: InstitutionType;
  title: string;
  description: string;
  endpoint: string;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;

    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-TZ", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function ConnectionIndicator({
  label,
  configured,
}: {
  label: string;
  configured?: boolean;
}) {
  if (configured === undefined) return null;

  return (
    <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      configured
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-500"
    }`}
    >
    {label}: {configured ? "Configured" : "Not configured"}
    </span>
  );
}

export default function InstitutionListPage({
  title,
  description,
  endpoint,
}: InstitutionListPageProps) {
  const router = useRouter();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  const loadInstitutions = useCallback(
    async (signal?: AbortSignal) => {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setLoadError("");

      const params = new URLSearchParams({
        page: String(page),
                                         pageSize: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      try {
        const response = await fetch(
          `${API_URL}${endpoint}?${params.toString()}`,
                                     {
                                       method: "GET",
                                       headers: {
                                         Authorization: `Bearer ${token}`,
                                       },
                                       signal,
                                     }
        );

        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          return;
        }

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            extractMessage(body, "Unable to load institution records.")
          );
        }

        if (
          !body ||
          !Array.isArray(body.data) ||
          !body.pagination
        ) {
          throw new Error("The server returned an unexpected response.");
        }

        const result = body as InstitutionResponse;

        setInstitutions(result.data);
        setPagination(result.pagination);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        setLoadError(
          error instanceof Error
          ? error.message
          : "An unexpected error occurred."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [endpoint, page, pageSize, router, search, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadInstitutions(controller.signal);

    return () => controller.abort();
  }, [loadInstitutions]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const showingFrom =
  pagination.total === 0
  ? 0
  : (pagination.page - 1) * pagination.pageSize + 1;

  const showingTo = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  );

  return (
    <div>
    <DashboardHeader title={title} />

    <PageContainer maxWidth="6xl">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
    <p className="max-w-3xl text-sm text-slate-500">
    {description}
    </p>

    <p className="mt-2 text-sm font-medium text-slate-600">
    Total registered:{" "}
    <span className="font-bold text-slate-900">
    {pagination.total}
    </span>
    </p>
    </div>

    <button
    type="button"
    onClick={() => router.push("/super-admin/dashboard")}
    className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
    >
    Back to Dashboard
    </button>
    </div>

    <form
    onSubmit={handleSearch}
    className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
    >
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px_130px_auto]">
    <div>
    <label
    htmlFor="institution-search"
    className="mb-2 block text-sm font-medium text-slate-700"
    >
    Search institutions
    </label>

    <input
    id="institution-search"
    type="search"
    value={searchInput}
    onChange={(event) => setSearchInput(event.target.value)}
    placeholder="Search by name, code or license..."
    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
    />
    </div>

    <div>
    <label
    htmlFor="institution-status"
    className="mb-2 block text-sm font-medium text-slate-700"
    >
    Filter by status
    </label>

    <select
    id="institution-status"
    value={status}
    onChange={(event) => handleStatusChange(event.target.value)}
    className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
    >
    <option value="">All statuses</option>
    <option value="ACTIVE">Active</option>
    <option value="INACTIVE">Inactive</option>
    <option value="SUSPENDED">Suspended</option>
    <option value="PENDING">Pending</option>
    </select>
    </div>

    <div>
    <label
    htmlFor="institution-page-size"
    className="mb-2 block text-sm font-medium text-slate-700"
    >
    Records per page
    </label>

    <select
    id="institution-page-size"
    value={pageSize}
    onChange={(event) => handlePageSizeChange(event.target.value)}
    className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
    >
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
    </select>
    </div>

    <div className="flex items-end">
    <button
    type="submit"
    className="w-full cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
    >
    Search
    </button>
    </div>
    </div>
    </form>

    {loadError && (
      <div className="mb-6 flex flex-col gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <p>{loadError}</p>

      <button
      type="button"
      onClick={() => loadInstitutions()}
      className="cursor-pointer font-semibold underline"
      >
      Try again
      </button>
      </div>
    )}

    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
    <div className="border-b border-gray-100 px-5 py-4">
    <h2 className="font-semibold text-slate-900">
    Registered institutions
    </h2>

    <p className="mt-1 text-xs text-slate-500">
    Institution information retrieved from the system database.
    </p>
    </div>

    {loading ? (
      <div className="px-6 py-16 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-700" />

      <p className="mt-4 text-sm text-slate-500">
      Loading institution records...
      </p>
      </div>
    ) : institutions.length === 0 ? (
      <div className="px-6 py-16 text-center">
      <p className="font-semibold text-slate-700">
      No institutions found
      </p>

      <p className="mt-2 text-sm text-slate-500">
      Try changing your search term or status filter.
      </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase text-slate-500">
      <tr>
      <th className="px-5 py-4 font-semibold">Institution</th>
      <th className="px-5 py-4 font-semibold">Reference</th>
      <th className="px-5 py-4 font-semibold">Contact</th>
      <th className="px-5 py-4 font-semibold">Status</th>
      <th className="px-5 py-4 font-semibold">Integration</th>
      <th className="px-5 py-4 font-semibold">Registered</th>
      </tr>
      </thead>

      <tbody className="divide-y divide-gray-100">
      {institutions.map((institution) => {
        const reference =
        institution.bankCode ??
        institution.licenseNumber ??
        institution.countryCode ??
        "—";

    return (
      <tr
      key={institution.id}
      className="transition hover:bg-gray-50"
      >
      <td className="px-5 py-4">
      <p className="font-semibold text-slate-900">
      {institution.name}
      </p>

      {institution.swiftCode && (
        <p className="mt-1 text-xs text-slate-500">
        SWIFT: {institution.swiftCode}
        </p>
      )}

      {institution.address && (
        <p className="mt-1 max-w-xs text-xs text-slate-500">
        {institution.address}
        </p>
      )}
      </td>

      <td className="px-5 py-4 text-slate-600">
      {reference}
      </td>

      <td className="px-5 py-4">
      <p className="text-slate-700">
      {institution.contactPhone || "—"}
      </p>

      <p className="mt-1 text-xs text-slate-500">
      {institution.contactEmail || "—"}
      </p>
      </td>

      <td className="px-5 py-4">
      <StatusBadge
      status={institution.status}
      domain="partner"
      />
      </td>

      <td className="px-5 py-4">
      <div className="flex min-w-[190px] flex-col items-start gap-1.5">
      <ConnectionIndicator
      label="API"
      configured={institution.hasApiEndpoint}
      />

      <ConnectionIndicator
      label="Credentials"
      configured={institution.hasApiCredentials}
      />

      <ConnectionIndicator
      label="Webhook"
      configured={institution.hasWebhook}
      />
      </div>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
      {formatDate(institution.createdAt)}
      </td>
      </tr>
    );
      })}
      </tbody>
      </table>
      </div>
    )}

    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-slate-500">
    Showing {showingFrom}–{showingTo} of {pagination.total} records
    </p>

    <div className="flex items-center gap-2">
    <button
    type="button"
    disabled={page <= 1 || loading}
    onClick={() =>
      setPage((current) => Math.max(1, current - 1))
    }
    className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
    Previous
    </button>

    <span className="min-w-[100px] text-center text-sm text-slate-600">
    Page {pagination.page} of {Math.max(1, pagination.totalPages)}
    </span>

    <button
    type="button"
    disabled={
      page >= pagination.totalPages ||
      pagination.totalPages === 0 ||
      loading
    }
    onClick={() =>
      setPage((current) =>
      Math.min(pagination.totalPages, current + 1)
      )
    }
    className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
    Next
    </button>
    </div>
    </div>
    </div>
    </PageContainer>
    </div>
  );
}
