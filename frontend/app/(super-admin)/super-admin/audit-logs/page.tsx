
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/utils/permissions";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import { useLanguage } from "@/lib/context/LanguageContext";
import { adminAuditLogsTranslations } from "@/constants/translations/admin-audit-logs";
import { commonTranslations } from "@/constants/translations/common";
import { API_URL } from "@/lib/utils/api";

interface AuditLogEntry {
  auditId: number;
  memberId: number | null;
  actionType: string;
  affectedTable: string | null;
  affectedRecordId: number | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function SuperAdminAuditLogsPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = adminAuditLogsTranslations[language];
  const common = commonTranslations[language];

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search filters
  const [searchDate, setSearchDate] = useState("");
  const [searchUserId, setSearchUserId] = useState("");

  const loadLogs = async () => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/audit-logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.loadError);
      }

      setLogs(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.loadError
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial audit log loading
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, t.loadError]);

  // Refresh logs when the browser tab receives focus
  useEffect(() => {
    window.addEventListener("focus", loadLogs);

    return () => {
      window.removeEventListener("focus", loadLogs);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format timestamps using the browser's local timezone.
  const getLocalDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Apply date and User ID filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesDate =
      !searchDate || getLocalDate(log.createdAt) === searchDate;

      const matchesUserId =
      !searchUserId.trim() ||
      (log.memberId !== null &&
      String(log.memberId).includes(searchUserId.trim()));

      return matchesDate && matchesUserId;
    });
  }, [logs, searchDate, searchUserId]);

  // Clear all search filters
  const clearFilters = () => {
    setSearchDate("");
    setSearchUserId("");
  };

  return (
    <div>
    <DashboardHeader title={t.title} />

    <PageContainer maxWidth="6xl">
    <p className="mt-6 text-sm text-slate-600">
    {t.subtitle}
    </p>

    {/* Error message */}
    {error && (
      <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
      {error}
      </div>
    )}

    {/* Search and filter section */}
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-1">
    <h2 className="text-base font-semibold text-gray-900">
    Search Audit Logs
    </h2>

    <p className="text-sm text-slate-500">
    Filter audit records by date or member User ID.
    </p>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* Date filter */}
    <div>
    <label
    htmlFor="audit-date"
    className="mb-2 block text-sm font-medium text-gray-700"
    >
    Search by Date
    </label>

    <input
    id="audit-date"
    type="date"
    value={searchDate}
    onChange={(e) => setSearchDate(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
    </div>

    {/* User ID filter */}
    <div>
    <label
    htmlFor="audit-user-id"
    className="mb-2 block text-sm font-medium text-gray-700"
    >
    Search by User ID
    </label>

    <input
    id="audit-user-id"
    type="text"
    inputMode="numeric"
    placeholder="Enter User ID..."
    value={searchUserId}
    onChange={(e) => setSearchUserId(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
    </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm text-slate-500">
    {loading
      ? "Loading records..."
      : `${filteredLogs.length} of ${logs.length} records found`}
      </p>

      <button
      type="button"
      onClick={clearFilters}
      disabled={!searchDate && !searchUserId}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
      Clear Filters
      </button>
      </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <p className="mt-8 text-slate-500">
        {t.loading}
        </p>
      ) : filteredLogs.length === 0 ? (
        /* No matching records */
        <div className="mt-8 rounded-xl border border-gray-100 bg-white p-8 text-center">
        <p className="font-medium text-gray-700">
        No audit records found.
        </p>

        <p className="mt-2 text-sm text-slate-500">
        Try changing your date or User ID filters.
        </p>
        </div>
      ) : (
        /* Audit Logs table */
        <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
        <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-slate-500">
        <tr>
        <th className="px-6 py-3 font-semibold">
        {t.colWhen}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colAction}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colTable}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colRecordId}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colActor}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colIpAddress}
        </th>

        <th className="px-6 py-3 font-semibold">
        {t.colChange}
        </th>
        </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
        {filteredLogs.map((log) => (
          <tr
          key={log.auditId}
          className="transition hover:bg-gray-50"
          >
          <td className="whitespace-nowrap px-6 py-4 text-slate-600">
          {new Date(log.createdAt).toLocaleString("en-TZ")}
          </td>

          <td className="px-6 py-4 font-medium text-gray-900">
          {log.actionType}
          </td>

          <td className="px-6 py-4 text-slate-600">
          {log.affectedTable || "—"}
          </td>

          <td className="px-6 py-4 text-slate-600">
          {log.affectedRecordId ?? "—"}
          </td>

          <td className="px-6 py-4 text-slate-600">
          {log.memberId ?? "—"}
          </td>

          <td className="px-6 py-4 text-slate-600">
          {log.ipAddress || "—"}
          </td>

          <td className="px-6 py-4 text-slate-600">
          {(log.oldValue || log.newValue) && (
            <details>
            <summary className="cursor-pointer text-emerald-700 hover:text-emerald-800">
            {common.view}
            </summary>

            <pre className="mt-2 max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">
            {log.oldValue &&
              `old: ${JSON.stringify(log.oldValue)}\n`}

              {log.newValue &&
                `new: ${JSON.stringify(log.newValue)}`}
                </pre>
                </details>
          )}
          </td>
          </tr>
        ))}
        </tbody>
        </table>
        </div>
      )}
      </PageContainer>
      </div>
  );
}
