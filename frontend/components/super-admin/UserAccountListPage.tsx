"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import { getAccessToken } from "@/lib/utils/permissions";
import { API_URL } from "@/lib/utils/api";

export type ManagedAccountCategory =
  | "members"
  | "administrators"
  | "bank-staff"
  | "telecom-staff"
  | "insurance-staff";

interface ManagedAccount {
  userId: number | string;
  firstName?: string | null;
  secondName?: string | null;
  surname?: string | null;
  email?: string | null;
  nidaNumber?: string | null;
  phoneNumber?: string | null;
  primaryPhoneNumber?: string | null;
  accountStatus?: string | null;
  memberStatus?: string | null;
  createdAt?: string | null;
}

interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AccountListResponse {
  data: ManagedAccount[];
  pagination?: Partial<Pagination>;
}

interface UserAccountListPageProps {
  category: ManagedAccountCategory;
  title: string;
  description: string;
}

const DEFAULT_PAGINATION: Pagination = {
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;

    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

function getAccountName(account: ManagedAccount): string {
  return [
    account.firstName,
    account.secondName,
    account.surname,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ") || "Name not provided";
}

function getPhoneNumber(account: ManagedAccount): string {
  return (
    account.primaryPhoneNumber ||
    account.phoneNumber ||
    "—"
  );
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

function normalizeStatus(value?: string | null): string {
  if (!value) return "Unknown";

  const normalized = value.trim().toLowerCase();

  if (normalized === "active") return "Active";
  if (normalized === "deactivated") return "Deactivated";
  if (normalized === "deleted") return "Deleted";
  if (normalized === "pending") return "Pending";
  if (normalized === "inactive") return "Inactive";
  if (normalized === "suspended") return "Suspended";

  return value;
}

function AccountStatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);

  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Deactivated: "bg-amber-50 text-amber-700",
    Deleted: "bg-red-50 text-red-700",
    Pending: "bg-blue-50 text-blue-700",
    Inactive: "bg-slate-100 text-slate-600",
    Suspended: "bg-orange-50 text-orange-700",
    Unknown: "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalized] || styles.Unknown
      }`}
    >
      {normalized}
    </span>
  );
}

export default function UserAccountListPage({
  category,
  title,
  description,
}: UserAccountListPageProps) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(DEFAULT_PAGINATION);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingUserId, setProcessingUserId] =
    useState<string | number | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const endpoint = `/super-admin/users/${category}`;

  const loadAccounts = useCallback(
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
            extractMessage(body, "Unable to load account records.")
          );
        }

        if (!body || !Array.isArray(body.data)) {
          throw new Error(
            "The server returned an unexpected account-list response."
          );
        }

        const result = body as AccountListResponse;
        const returnedPagination = result.pagination;

        setAccounts(result.data);

        setPagination({
          total: Number(returnedPagination?.total ?? result.data.length),
          page: Number(returnedPagination?.page ?? page),
          pageSize: Number(returnedPagination?.pageSize ?? pageSize),
          totalPages: Number(
            returnedPagination?.totalPages ??
              Math.ceil(
                Number(returnedPagination?.total ?? result.data.length) /
                  pageSize
              )
          ),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

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

    loadAccounts(controller.signal);

    return () => controller.abort();
  }, [loadAccounts]);

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

  const performAccountAction = async (
    userId: string | number,
    action: "activate" | "deactivate" | "delete"
  ) => {
    const account = accounts.find(
      (item) => String(item.userId) === String(userId)
    );

    if (!account) return;

    const accountName = getAccountName(account);

    const confirmationMessages = {
      activate: `Reactivate the account belonging to ${accountName}?`,
      deactivate: `Deactivate the account belonging to ${accountName}?`,
      delete:
        `Delete and anonymize the account belonging to ${accountName}? ` +
        "This action may not be reversible.",
    };

    if (!window.confirm(confirmationMessages[action])) return;

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setProcessingUserId(userId);
    setActionError("");

    try {
      const response = await fetch(
        `${API_URL}/super-admin/users/${category}/${encodeURIComponent(
          String(userId)
        )}/${action}`,
        {
          method: action === "delete" ? "DELETE" : "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          extractMessage(body, `Unable to ${action} this account.`)
        );
      }

      await loadAccounts();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The account action could not be completed."
      );
    } finally {
      setProcessingUserId(null);
    }
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
                htmlFor="account-search"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search accounts
              </label>

              <input
                id="account-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, email, NIDA or phone..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="account-status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Account status
              </label>

              <select
                id="account-status"
                value={status}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="account-page-size"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Records per page
              </label>

              <select
                id="account-page-size"
                value={pageSize}
                onChange={(event) =>
                  handlePageSizeChange(event.target.value)
                }
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

        {(loadError || actionError) && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError && <p>{loadError}</p>}
            {actionError && <p>{actionError}</p>}

            <button
              type="button"
              onClick={() => {
                setActionError("");
                loadAccounts();
              }}
              className="cursor-pointer self-start font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Registered accounts
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Accounts in this category. Deleted accounts are excluded.
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-700" />

              <p className="mt-4 text-sm text-slate-500">
                Loading account records...
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-slate-700">
                No accounts found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search term or account-status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Account holder</th>
                    <th className="px-5 py-4 font-semibold">Contact</th>
                    <th className="px-5 py-4 font-semibold">NIDA</th>
                    <th className="px-5 py-4 font-semibold">Account status</th>
                    {category === "members" && (
                      <th className="px-5 py-4 font-semibold">Member status</th>
                    )}
                    <th className="px-5 py-4 font-semibold">Registered</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {accounts.map((account) => {
                    const accountStatus = normalizeStatus(
                      account.accountStatus
                    );
                    const isProcessing =
                      String(processingUserId) === String(account.userId);

                    return (
                      <tr
                        key={account.userId}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {getAccountName(account)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {account.userId}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-700">
                            {account.email || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getPhoneNumber(account)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {account.nidaNumber || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <AccountStatusBadge
                            status={account.accountStatus}
                          />
                        </td>

                        {category === "members" && (
                          <td className="px-5 py-4">
                            <AccountStatusBadge
                              status={account.memberStatus}
                            />
                          </td>
                        )}

                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {formatDate(account.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex min-w-[190px] flex-wrap gap-2">
                            {accountStatus === "Active" ? (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  performAccountAction(
                                    account.userId,
                                    "deactivate"
                                  )
                                }
                                className="cursor-pointer rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            ) : accountStatus === "Deactivated" ? (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  performAccountAction(
                                    account.userId,
                                    "activate"
                                  )
                                }
                                className="cursor-pointer rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            ) : null}

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                performAccountAction(
                                  account.userId,
                                  "delete"
                                )
                              }
                              className="cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>

                            {isProcessing && (
                              <span className="self-center text-xs text-slate-500">
                                Processing...
                              </span>
                            )}
                          </div>
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
                Page {pagination.page} of{" "}
                {Math.max(1, pagination.totalPages)}
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
